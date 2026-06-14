import { Router } from "express"
import type { ICounselingRecord } from "@teacher-erp/shared-types"
import { demoUsersById } from "@teacher-erp/shared-utils"
import { authenticate } from "../middleware/authenticate.js"
import { writeAuditLog } from "../utils/auditLog.js"
import { createNotification } from "../utils/createNotification.js"
import { CounselingRecordModel as CounselingDoc } from "@teacher-erp/shared-db"

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

  void writeAuditLog({
    collection: "counselingrecords",
    doc_id: newRecord._id as string,
    student_id: studentId,
    operation: "create",
    actor_id: user._id,
    after: newRecord.toObject() as unknown,
  })

  createNotification(studentId, "새 상담 기록", "상담 기록이 등록되었습니다.")
  if (is_shared) {
    for (const u of Object.values(demoUsersById)) {
      if (u.role === "TEACHER" && u._id !== user._id) {
        createNotification(u._id, "공유 상담 기록", "새 공유 상담 기록이 등록되었습니다.")
      }
    }
  }

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

  const before = record.toObject() as unknown
  const { content, next_plan, is_shared } = req.body as Partial<ICounselingRecord>

  if (typeof content === "string") record.content = content
  if (typeof next_plan === "string") record.next_plan = next_plan
  if (typeof is_shared === "boolean") record.is_shared = is_shared

  const updated = await record.save()

  void writeAuditLog({
    collection: "counselingrecords",
    doc_id: record._id as string,
    student_id: record.student_id,
    operation: "update",
    actor_id: user._id,
    before,
    after: updated.toObject() as unknown,
  })

  createNotification(record.student_id, "상담 기록 수정", "상담 기록이 수정되었습니다.")
  if (updated.is_shared) {
    for (const u of Object.values(demoUsersById)) {
      if (u.role === "TEACHER" && u._id !== user._id) {
        createNotification(u._id, "공유 상담 기록 수정", "공유 상담 기록이 수정되었습니다.")
      }
    }
  }

  res.json(updated.toObject())
})

// DELETE /api/counseling/:recordId — author TEACHER only
router.delete("/:recordId", authenticate, async (req, res) => {
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

  const snapshot = record.toObject() as unknown
  await record.deleteOne()

  void writeAuditLog({
    collection: "counselingrecords",
    doc_id: record._id as string,
    student_id: record.student_id,
    operation: "delete",
    actor_id: user._id,
    before: snapshot,
  })

  res.status(204).end()
})

export default router
