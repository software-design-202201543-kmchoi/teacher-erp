import { Router } from "express"
import { calcGrade, demoUsersById } from "@teacher-erp/shared-utils"
import type { IParentUser } from "@teacher-erp/shared-types"
import { authenticate } from "../middleware/authenticate.js"
import { createNotification } from "../utils/createNotification.js"
import { writeAuditLog } from "../utils/auditLog.js"
import { GradeDoc } from "../models/grade.js"

const router = Router()

// GET /api/grades/by-student/:studentId
// TEACHER: any student | STUDENT: own grades only | PARENT: children's grades
router.get("/by-student/:studentId", authenticate, async (req, res) => {
  const user = req.authUser!
  const studentId = req.params["studentId"] as string

  const canRead =
    user.role === "TEACHER" ||
    (user.role === "STUDENT" && studentId === user._id) ||
    (user.role === "PARENT" && (user as IParentUser).children.includes(studentId))

  if (!canRead) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const grades = await GradeDoc.find({ student_id: studentId }).sort({ term: 1 }).lean()
  res.json(grades)
})

// POST /api/grades/by-student/:studentId — TEACHER only
router.post("/by-student/:studentId", authenticate, async (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const studentId = req.params["studentId"] as string
  const { subject_id, term, score } = req.body as {
    subject_id?: string
    term?: string
    score?: number
  }

  if (!subject_id || !term || typeof score !== "number") {
    res.status(400).json({ message: "subject_id, term, and score are required" })
    return
  }

  const newGrade = await GradeDoc.create({
    _id: `grade-${Date.now()}`,
    student_id: studentId,
    subject_id,
    teacher_id: user._id,
    term,
    score,
    calculated_grade: calcGrade(score),
  })

  void writeAuditLog({
    collection: "grades",
    doc_id: newGrade._id as string,
    student_id: studentId,
    operation: "create",
    actor_id: user._id,
    after: newGrade.toObject() as unknown,
  })

  createNotification(
    studentId,
    "새 성적 등록",
    `${subject_id.replace("subject-", "")} 과목 성적이 등록되었습니다. ${score}점`,
  )
  for (const u of Object.values(demoUsersById)) {
    if (u.role === "PARENT" && (u as IParentUser).children.includes(studentId)) {
      createNotification(u._id, "자녀 성적 업데이트", "학생 성적이 등록되었습니다.")
    }
  }

  res.status(201).json(newGrade)
})

// PUT /api/grades/:gradeId — TEACHER only, must own the grade
router.put("/:gradeId", authenticate, async (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const gradeId = req.params["gradeId"] as string
  const grade = await GradeDoc.findById(gradeId)

  if (!grade) {
    res.status(404).json({ message: "Grade not found" })
    return
  }

  if (grade.teacher_id !== user._id) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const before = grade.toObject() as unknown
  const { score } = req.body as { score?: number }

  if (typeof score === "number") {
    grade.score = score
    grade.calculated_grade = calcGrade(score)
  }

  const updated = await grade.save()

  void writeAuditLog({
    collection: "grades",
    doc_id: gradeId,
    student_id: grade.student_id,
    operation: "update",
    actor_id: user._id,
    before,
    after: updated.toObject() as unknown,
  })

  res.json(updated.toObject())
})

// DELETE /api/grades/:gradeId — TEACHER only, must own the grade
router.delete("/:gradeId", authenticate, async (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const gradeId = req.params["gradeId"] as string
  const grade = await GradeDoc.findById(gradeId)

  if (!grade) {
    res.status(404).json({ message: "Grade not found" })
    return
  }

  if (grade.teacher_id !== user._id) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const snapshot = grade.toObject() as unknown
  await grade.deleteOne()

  void writeAuditLog({
    collection: "grades",
    doc_id: gradeId,
    student_id: grade.student_id,
    operation: "delete",
    actor_id: user._id,
    before: snapshot,
  })

  res.status(204).end()
})

export default router
