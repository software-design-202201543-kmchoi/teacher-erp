import { Router } from "express"
import type { ICounselingRecord } from "@teacher-erp/shared-types"
import { authenticate } from "../middleware/authenticate.js"
import { CounselingDoc } from "../models/counseling.js"

const router = Router()

// GET /api/counseling/by-student/:studentId
// TEACHER only; sees own records + shared records. Supports from/to/keyword filters.
router.get("/by-student/:studentId", authenticate, async (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const studentId = req.params["studentId"] as string
  const { from, to, keyword } = req.query

  const filter: Record<string, unknown> = {
    student_id: studentId,
    $or: [{ is_shared: true }, { teacher_id: user._id }],
  }

  if (typeof from === "string") filter["counsel_date"] = { $gte: from }
  if (typeof to === "string") {
    filter["counsel_date"] = {
      ...(typeof filter["counsel_date"] === "object" ? (filter["counsel_date"] as object) : {}),
      $lte: to,
    }
  }
  if (typeof keyword === "string" && keyword.trim()) {
    const kw = new RegExp(keyword.trim(), "i")
    filter["$and"] = [{ $or: [{ content: kw }, { next_plan: kw }] }]
  }

  const records = await CounselingDoc.find(filter).sort({ counsel_date: -1 }).lean()
  res.json(records)
})

// POST /api/counseling/by-student/:studentId — TEACHER only
router.post("/by-student/:studentId", authenticate, async (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const studentId = req.params["studentId"] as string
  const { counsel_date, content, next_plan, is_shared } = req.body as Partial<ICounselingRecord>

  if (!counsel_date || !content || typeof is_shared !== "boolean") {
    res.status(400).json({ message: "counsel_date, content, and is_shared are required" })
    return
  }

  const newRecord = await CounselingDoc.create({
    _id: `counsel-${Date.now()}`,
    student_id: studentId,
    teacher_id: user._id,
    counsel_date,
    content,
    ...(typeof next_plan === "string" ? { next_plan } : {}),
    is_shared,
  })

  res.status(201).json(newRecord)
})

// PUT /api/counseling/:recordId — author TEACHER only
router.put("/:recordId", authenticate, async (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const record = await CounselingDoc.findById(req.params["recordId"])

  if (!record) {
    res.status(404).json({ message: "Record not found" })
    return
  }

  if (record.teacher_id !== user._id) {
    res.status(403).json({ message: "Forbidden: you are not the author of this record" })
    return
  }

  const { content, next_plan, is_shared } = req.body as Partial<ICounselingRecord>

  if (typeof content === "string") record.content = content
  if (typeof next_plan === "string") record.next_plan = next_plan
  if (typeof is_shared === "boolean") record.is_shared = is_shared

  const updated = await record.save()
  res.json(updated.toObject())
})

export default router
