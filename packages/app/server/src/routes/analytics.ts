import { Router } from "express"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { authenticate } from "../middleware/authenticate.js"
import { getSnapshot, getAllSnapshots, getAllSummaries } from "../workers/olap-pipeline.js"

const router = Router()

// GET /api/analytics/students/:id/snapshot?term=2026-1
// Reads from the analytics collection — never touches operational collections.
// Omitting ?term returns all snapshots (used by the UI to populate term tabs).
// TEACHER only.
router.get("/students/:id/snapshot", authenticate, async (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const studentId = req.params["id"] as string
  const { term } = req.query

  if (typeof term === "string" && term) {
    const snapshot = await getSnapshot(studentId, term)
    if (!snapshot) {
      res.status(404).json({ message: "Snapshot not found for this term" })
      return
    }
    res.json(snapshot)
    return
  }

  res.json(await getAllSnapshots(studentId))
})

// GET /api/analytics/students/:id/subject-progress
// Returns SubjectProgressSummary[] for all subjects. TEACHER only.
router.get("/students/:id/subject-progress", authenticate, async (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  res.json(await getAllSummaries(req.params["id"] as string))
})

// POST /api/analytics/students/:id/chat
// AI chatbot: teacher asks natural-language questions about a student's learning status.
// Uses StudentLearningSnapshot + SubjectProgressSummary as context for Claude.
// TEACHER only — student PII included only after auth check.
router.post("/students/:id/chat", authenticate, async (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({ message: "AI 챗봇 기능을 사용하려면 GEMINI_API_KEY를 설정해야 합니다." })
    return
  }

  const { message } = req.body as { message?: string }
  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ message: "message 필드가 필요합니다." })
    return
  }

  const studentId = req.params["id"] as string

  const [snapshots, subjectProgress] = await Promise.all([
    getAllSnapshots(studentId),
    getAllSummaries(studentId),
  ])

  const snapshotContext = snapshots.length
    ? snapshots
        .map(
          (s) =>
            `[${s.term}] 평균:${s.avg_score.toFixed(1)}점 등급:${s.overall_grade} 피드백:${s.feedback_count}건 상담:${s.counseling_count}건 출결:${s.attendance_summary}` +
            (s.subject_scores.length
              ? `\n  과목별: ${s.subject_scores.map((ss) => `${ss.subject_name}=${ss.score}점(${ss.grade})`).join(", ")}`
              : ""),
        )
        .join("\n")
    : "집계된 학습 데이터 없음"

  const progressContext = subjectProgress.length
    ? subjectProgress
        .map(
          (p) =>
            `${p.subject_id.replace(/^subject-/, "")} 평균:${p.avg_score.toFixed(1)}점 추세:${p.trend} 이력:${p.score_history.map((h) => `${h.term}=${h.score}`).join("→")}`,
        )
        .join("\n")
    : "과목별 진도 데이터 없음"

  const systemPrompt = `당신은 교사의 학생 학습 지도를 돕는 AI 어시스턴트입니다.
아래는 분석 DB에서 집계된 학생 학습 현황 데이터입니다. 이 데이터를 기반으로 교사의 질문에 간결하고 실용적으로 답하세요.
학생 개인정보(이름, 학번)는 별도로 제공되지 않으며, 데이터는 시스템에서 집계된 통계입니다.

--- 학기별 스냅샷 ---
${snapshotContext}

--- 과목별 진도 ---
${progressContext}
---

교사의 질문에 핵심만 간결하게 한국어로 답하세요. 마크다운 사용 가능.`

  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genai.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  })
  const result = await model.generateContent(message)
  const reply = result.response.text() || "응답을 생성하지 못했습니다."

  res.json({ reply })
})

export default router
