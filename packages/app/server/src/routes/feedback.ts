import { Router } from "express"
import { demoFeedbackByStudentId } from "@teacher-erp/shared-utils"
import type { IFeedback, IParentUser, FeedbackType, FeedbackVisibility } from "@teacher-erp/shared-types"
import { authenticate } from "../middleware/authenticate.js"

const router = Router()

const VALID_TYPES: FeedbackType[] = ["성적", "행동", "출결", "태도"]
const VALID_VISIBILITIES: FeedbackVisibility[] = ["PRIVATE", "STUDENT", "PARENT", "ALL"]

let nextIdCounter = 100

function generateId(): string {
  return `fb-${++nextIdCounter}`
}

// GET /api/feedback/by-student/:studentId — 역할별 visibility 필터
router.get("/by-student/:studentId", authenticate, (req, res) => {
  const user = req.authUser!
  const { studentId } = req.params
  let feedbacks: IFeedback[] = demoFeedbackByStudentId[studentId] ?? []

  if (user.role === "TEACHER") {
    // 모든 피드백 조회 가능
  } else if (user.role === "STUDENT") {
    if (studentId !== user._id) {
      res.status(403).json({ message: "Forbidden" })
      return
    }
    feedbacks = feedbacks.filter((f) => ["STUDENT", "ALL"].includes(f.visibility))
  } else if (user.role === "PARENT") {
    const parent = user as IParentUser
    if (!parent.children.includes(studentId)) {
      res.status(403).json({ message: "Forbidden" })
      return
    }
    feedbacks = feedbacks.filter((f) => ["PARENT", "ALL"].includes(f.visibility))
  } else {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  res.json(feedbacks)
})

// POST /api/feedback/by-student/:studentId — TEACHER만
router.post("/by-student/:studentId", authenticate, (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden: TEACHER role required" })
    return
  }

  const { studentId } = req.params
  const { type, content, visibility } = req.body as {
    type: unknown
    content: unknown
    visibility: unknown
  }

  if (typeof type !== "string" || !VALID_TYPES.includes(type as FeedbackType)) {
    res.status(400).json({ message: `type must be one of: ${VALID_TYPES.join(", ")}` })
    return
  }

  if (typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ message: "content is required" })
    return
  }

  if (typeof visibility !== "string" || !VALID_VISIBILITIES.includes(visibility as FeedbackVisibility)) {
    res.status(400).json({ message: `visibility must be one of: ${VALID_VISIBILITIES.join(", ")}` })
    return
  }

  const now = new Date()
  const newFeedback: IFeedback = {
    _id: generateId(),
    student_id: studentId,
    teacher_id: user._id,
    type: type as FeedbackType,
    content: content.trim(),
    visibility: visibility as FeedbackVisibility,
    createdAt: now,
    updatedAt: now,
  }

  if (!demoFeedbackByStudentId[studentId]) {
    demoFeedbackByStudentId[studentId] = []
  }
  demoFeedbackByStudentId[studentId].push(newFeedback)

  res.status(201).json(newFeedback)
})

// PUT /api/feedback/:feedbackId — 작성 TEACHER만
router.put("/:feedbackId", authenticate, (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden: TEACHER role required" })
    return
  }

  const { feedbackId } = req.params

  let targetFeedback: IFeedback | undefined
  for (const feedbacks of Object.values(demoFeedbackByStudentId)) {
    targetFeedback = feedbacks.find((f) => f._id === feedbackId)
    if (targetFeedback) break
  }

  if (!targetFeedback) {
    res.status(404).json({ message: "Feedback not found" })
    return
  }

  if (targetFeedback.teacher_id !== user._id) {
    res.status(403).json({ message: "Forbidden: only the author teacher can update this feedback" })
    return
  }

  const { type, content, visibility } = req.body as {
    type?: unknown
    content?: unknown
    visibility?: unknown
  }

  if (type !== undefined) {
    if (typeof type !== "string" || !VALID_TYPES.includes(type as FeedbackType)) {
      res.status(400).json({ message: `type must be one of: ${VALID_TYPES.join(", ")}` })
      return
    }
    targetFeedback.type = type as FeedbackType
  }

  if (content !== undefined) {
    if (typeof content !== "string" || content.trim() === "") {
      res.status(400).json({ message: "content must be a non-empty string" })
      return
    }
    targetFeedback.content = content.trim()
  }

  if (visibility !== undefined) {
    if (typeof visibility !== "string" || !VALID_VISIBILITIES.includes(visibility as FeedbackVisibility)) {
      res.status(400).json({ message: `visibility must be one of: ${VALID_VISIBILITIES.join(", ")}` })
      return
    }
    targetFeedback.visibility = visibility as FeedbackVisibility
  }

  targetFeedback.updatedAt = new Date()

  res.json(targetFeedback)
})

// DELETE /api/feedback/:feedbackId — 작성 TEACHER만
router.delete("/:feedbackId", authenticate, (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden: TEACHER role required" })
    return
  }

  const { feedbackId } = req.params

  for (const [studentId, feedbacks] of Object.entries(demoFeedbackByStudentId)) {
    const idx = feedbacks.findIndex((f) => f._id === feedbackId)
    if (idx !== -1) {
      if (feedbacks[idx].teacher_id !== user._id) {
        res.status(403).json({ message: "Forbidden: only the author teacher can delete this feedback" })
        return
      }
      demoFeedbackByStudentId[studentId].splice(idx, 1)
      res.status(204).end()
      return
    }
  }

  res.status(404).json({ message: "Feedback not found" })
})

export default router
