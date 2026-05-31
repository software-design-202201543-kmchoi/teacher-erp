import { Router } from "express"
import { demoUsers } from "@teacher-erp/shared-utils"
import type { IStudentUser } from "@teacher-erp/shared-types"
import { authenticate } from "../middleware/authenticate.js"
import { GradeDoc } from "../models/grade.js"
import { FeedbackDoc } from "../models/feedback.js"
import { CounselingDoc } from "../models/counseling.js"

const router = Router()

type SearchDataType = "GRADE" | "FEEDBACK" | "COUNSELING"

interface SearchResultItem {
  id: string
  student_id: string
  student_name: string
  grade_level: number
  class_num: number
  student_num: number
  data_type: SearchDataType
  subject?: string
  summary: string
  occurred_at: string
}

router.get("/", authenticate, async (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : ""
  const subject = typeof req.query.subject === "string" ? req.query.subject.trim() : ""
  const from = typeof req.query.from === "string" ? req.query.from : ""
  const to = typeof req.query.to === "string" ? req.query.to : ""
  const page = Math.max(1, Number(req.query.page ?? 1) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(req.query.page_size ?? 20) || 20))
  const requestedTypes = typeof req.query.types === "string" ? req.query.types.split(",").map((t) => t.trim().toUpperCase()) : []
  const types = (requestedTypes.length > 0 ? requestedTypes : ["GRADE", "FEEDBACK", "COUNSELING"])
    .filter((t): t is SearchDataType => t === "GRADE" || t === "FEEDBACK" || t === "COUNSELING")

  const allStudents = demoUsers.filter((u): u is IStudentUser => u.role === "STUDENT")
  const studentById = new Map(allStudents.map((s) => [s._id, s]))

  const filteredStudentIds = allStudents
    .filter((s) => {
      if (!q) return true
      const hay = `${s.name} ${s.grade_level} ${s.class_num} ${s.student_num}`.toLowerCase()
      return hay.includes(q.toLowerCase())
    })
    .map((s) => s._id)

  if (filteredStudentIds.length === 0) {
    res.json({ page, page_size: pageSize, total: 0, items: [] })
    return
  }

  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null

  const items: SearchResultItem[] = []

  if (types.includes("GRADE")) {
    const gradeFilter: Record<string, unknown> = { student_id: { $in: filteredStudentIds } }
    if (subject) gradeFilter.subject_id = `subject-${subject}`
    if (fromDate || toDate) {
      gradeFilter.createdAt = {
        ...(fromDate ? { $gte: fromDate } : {}),
        ...(toDate ? { $lte: toDate } : {}),
      }
    }
    const grades = await GradeDoc.find(gradeFilter).lean()
    for (const g of grades) {
      const s = studentById.get(g.student_id)
      if (!s) continue
      items.push({
        id: String(g._id),
        student_id: s._id,
        student_name: s.name,
        grade_level: s.grade_level,
        class_num: s.class_num,
        student_num: s.student_num,
        data_type: "GRADE",
        subject: g.subject_id.replace(/^subject-/, ""),
        summary: `${g.term} ${g.subject_id.replace(/^subject-/, "")} ${g.score}점 (${g.calculated_grade}등급)`,
        occurred_at: new Date(g.createdAt).toISOString(),
      })
    }
  }

  if (types.includes("FEEDBACK")) {
    const feedbackFilter: Record<string, unknown> = { student_id: { $in: filteredStudentIds } }
    if (fromDate || toDate) {
      feedbackFilter.createdAt = {
        ...(fromDate ? { $gte: fromDate } : {}),
        ...(toDate ? { $lte: toDate } : {}),
      }
    }
    const feedbacks = await FeedbackDoc.find(feedbackFilter).lean()
    for (const f of feedbacks) {
      const s = studentById.get(f.student_id)
      if (!s) continue
      if (q && !`${f.type} ${f.content}`.toLowerCase().includes(q.toLowerCase()) && !s.name.toLowerCase().includes(q.toLowerCase())) continue
      items.push({
        id: String(f._id),
        student_id: s._id,
        student_name: s.name,
        grade_level: s.grade_level,
        class_num: s.class_num,
        student_num: s.student_num,
        data_type: "FEEDBACK",
        summary: `[${f.type}] ${f.content.slice(0, 120)}`,
        occurred_at: new Date(f.createdAt).toISOString(),
      })
    }
  }

  if (types.includes("COUNSELING")) {
    const counselingFilter: Record<string, unknown> = { student_id: { $in: filteredStudentIds } }
    if (from || to) {
      counselingFilter.counsel_date = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      }
    }
    const records = await CounselingDoc.find(counselingFilter).lean()
    for (const c of records) {
      const s = studentById.get(c.student_id)
      if (!s) continue
      if (q && !`${c.content} ${c.next_plan ?? ""}`.toLowerCase().includes(q.toLowerCase()) && !s.name.toLowerCase().includes(q.toLowerCase())) continue
      items.push({
        id: String(c._id),
        student_id: s._id,
        student_name: s.name,
        grade_level: s.grade_level,
        class_num: s.class_num,
        student_num: s.student_num,
        data_type: "COUNSELING",
        summary: `${c.content.slice(0, 120)}${c.next_plan ? ` / 다음: ${c.next_plan.slice(0, 60)}` : ""}`,
        occurred_at: new Date(c.counsel_date).toISOString(),
      })
    }
  }

  items.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

  const total = items.length
  const start = (page - 1) * pageSize
  const pagedItems = items.slice(start, start + pageSize)

  res.json({
    page,
    page_size: pageSize,
    total,
    items: pagedItems,
  })
})

export default router
