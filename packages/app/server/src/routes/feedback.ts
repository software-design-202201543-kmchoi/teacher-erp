import { Router } from "express"
import { demoUsersById } from "@teacher-erp/shared-utils"
import type { IFeedback, IParentUser, FeedbackType, FeedbackVisibility } from "@teacher-erp/shared-types"
import { authenticate } from "../middleware/authenticate.js"
import { createNotification } from "../utils/createNotification.js"
import { FeedbackDoc } from "../models/feedback.js"

const router = Router()

const VALID_TYPES: FeedbackType[] = ["성적", "행동", "출결", "태도"]
const VALID_VISIBILITIES: FeedbackVisibility[] = ["PRIVATE", "STUDENT", "PARENT", "ALL"]

// GET /api/feedback/by-student/:studentId — role-based visibility filter
router.get("/by-student/:studentId", authenticate, async (req, res) => {
  const user = req.authUser!
  const studentId = req.params["studentId"] as string

  let filter: Record<string, unknown> = { student_id: studentId }

  if (user.role === "TEACHER") {
    // no additional filter
  } else if (user.role === "STUDENT") {
    if (studentId !== user._id) {
      res.status(403).json({ message: "Forbidden" })
      return
    }
    filter["visibility"] = { $in: ["STUDENT", "ALL"] }
  } else if (user.role === "PARENT") {
    const parent = user as IParentUser
    if (!parent.children.includes(studentId)) {
      res.status(403).json({ message: "Forbidden" })
      return
    }
    filter["visibility"] = { $in: ["PARENT", "ALL"] }
  } else {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const feedbacks = await FeedbackDoc.find(filter).sort({ createdAt: -1 }).lean()
  res.json(feedbacks)
})

// POST /api/feedback/by-student/:studentId — TEACHER only
router.post("/by-student/:studentId", authenticate, async (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden: TEACHER role required" })
    return
  }

  const studentId = req.params["studentId"] as string
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

  const newFeedback = await FeedbackDoc.create({
    _id: `fb-${Date.now()}`,
    student_id: studentId,
    teacher_id: user._id,
    type: type as FeedbackType,
    content: content.trim(),
    visibility: visibility as FeedbackVisibility,
  })

  if (["STUDENT", "ALL"].includes(newFeedback.visibility)) {
    createNotification(studentId, "새 피드백", "교사가 피드백을 작성했습니다.")
  }
  if (["PARENT", "ALL"].includes(newFeedback.visibility)) {
    for (const u of Object.values(demoUsersById)) {
      if (u.role === "PARENT" && (u as IParentUser).children.includes(studentId)) {
        createNotification(u._id, "자녀 피드백", "자녀에 대한 피드백이 작성되었습니다.")
      }
    }
  }

  res.status(201).json(newFeedback)
})

// PUT /api/feedback/:feedbackId — author TEACHER only
router.put("/:feedbackId", authenticate, async (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden: TEACHER role required" })
    return
  }

  const feedback = await FeedbackDoc.findById(req.params["feedbackId"])

  if (!feedback) {
    res.status(404).json({ message: "Feedback not found" })
    return
  }

  if (feedback.teacher_id !== user._id) {
    res.status(403).json({ message: "Forbidden: only the author teacher can update" })
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
    feedback.type = type as FeedbackType
  }
  if (content !== undefined) {
    if (typeof content !== "string" || content.trim() === "") {
      res.status(400).json({ message: "content must be a non-empty string" })
      return
    }
    feedback.content = content.trim()
  }
  if (visibility !== undefined) {
    if (typeof visibility !== "string" || !VALID_VISIBILITIES.includes(visibility as FeedbackVisibility)) {
      res.status(400).json({ message: `visibility must be one of: ${VALID_VISIBILITIES.join(", ")}` })
      return
    }
    feedback.visibility = visibility as FeedbackVisibility
  }

  const updated = await feedback.save()
  res.json(updated.toObject())
})

// DELETE /api/feedback/:feedbackId — author TEACHER only
router.delete("/:feedbackId", authenticate, async (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden: TEACHER role required" })
    return
  }

  const feedback = await FeedbackDoc.findById(req.params["feedbackId"])

  if (!feedback) {
    res.status(404).json({ message: "Feedback not found" })
    return
  }

  if (feedback.teacher_id !== user._id) {
    res.status(403).json({ message: "Forbidden: only the author teacher can delete" })
    return
  }

  await feedback.deleteOne()
  res.status(204).end()
})

export default router
