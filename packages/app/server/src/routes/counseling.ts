import { Router } from "express"
import { demoCounselingByStudentId } from "@teacher-erp/shared-utils"
import type { ICounselingRecord } from "@teacher-erp/shared-types"
import { authenticate } from "../middleware/authenticate.js"

const router = Router()

// GET /api/counseling/by-student/:studentId
// TEACHER access only; filters by is_shared or authoring teacher
// Supports query params: from, to, keyword
router.get("/by-student/:studentId", authenticate, (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { studentId } = req.params
  let records = (demoCounselingByStudentId[studentId] ?? []).slice()

  // Teachers may only see shared records or records they authored
  records = records.filter((r) => r.is_shared || r.teacher_id === user._id)

  const { from, to, keyword } = req.query

  if (typeof from === "string") {
    const fromDate = new Date(from)
    records = records.filter((r) => new Date(r.counsel_date) >= fromDate)
  }

  if (typeof to === "string") {
    const toDate = new Date(to)
    records = records.filter((r) => new Date(r.counsel_date) <= toDate)
  }

  if (typeof keyword === "string" && keyword.trim()) {
    const kw = keyword.toLowerCase()
    records = records.filter(
      (r) =>
        r.content.toLowerCase().includes(kw) ||
        r.next_plan?.toLowerCase().includes(kw)
    )
  }

  // Sort descending by counsel_date
  records.sort(
    (a, b) => new Date(b.counsel_date).getTime() - new Date(a.counsel_date).getTime()
  )

  res.json(records)
})

// POST /api/counseling/by-student/:studentId
// TEACHER only; adds a new counseling record in-memory
router.post("/by-student/:studentId", authenticate, (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { studentId } = req.params
  const { counsel_date, content, next_plan, is_shared } = req.body

  if (!counsel_date || !content || typeof is_shared !== "boolean") {
    res.status(400).json({ message: "counsel_date, content, and is_shared are required" })
    return
  }

  const now = new Date()
  const newRecord: ICounselingRecord = {
    _id: `counsel-${Date.now()}`,
    student_id: studentId,
    teacher_id: user._id,
    counsel_date: new Date(counsel_date as string),
    content: content as string,
    next_plan: typeof next_plan === "string" ? next_plan : undefined,
    is_shared: is_shared as boolean,
    createdAt: now,
    updatedAt: now,
  }

  if (!demoCounselingByStudentId[studentId]) {
    demoCounselingByStudentId[studentId] = []
  }
  demoCounselingByStudentId[studentId].push(newRecord)

  res.status(201).json(newRecord)
})

// PUT /api/counseling/:recordId
// TEACHER only; only the authoring teacher may update
router.put("/:recordId", authenticate, (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { recordId } = req.params

  // Find the record across all students
  let found: ICounselingRecord | undefined
  for (const records of Object.values(demoCounselingByStudentId)) {
    found = records.find((r) => r._id === recordId)
    if (found) break
  }

  if (!found) {
    res.status(404).json({ message: "Record not found" })
    return
  }

  if (found.teacher_id !== user._id) {
    res.status(403).json({ message: "Forbidden: you are not the author of this record" })
    return
  }

  const { content, next_plan, is_shared } = req.body

  if (typeof content === "string") found.content = content
  if (typeof next_plan === "string") found.next_plan = next_plan
  if (typeof is_shared === "boolean") found.is_shared = is_shared
  found.updatedAt = new Date()

  res.json(found)
})

export default router
