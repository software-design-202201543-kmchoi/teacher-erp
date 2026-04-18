import { Router } from "express"
import { demoGrades, demoGradesByStudentId, calcGrade, demoUsersById } from "@teacher-erp/shared-utils"
import type { IParentUser } from "@teacher-erp/shared-types"
import { authenticate } from "../middleware/authenticate.js"
import { createNotification } from "../utils/createNotification.js"

const router = Router()

// GET /api/grades/by-student/:studentId
// TEACHER: any student | STUDENT: own grades only | PARENT: children's grades
router.get("/by-student/:studentId", authenticate, (req, res) => {
  const user = req.authUser!
  const { studentId } = req.params

  const canRead =
    user.role === "TEACHER" ||
    (user.role === "STUDENT" && studentId === user._id) ||
    (user.role === "PARENT" && (user as IParentUser).children.includes(studentId))

  if (!canRead) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const grades = demoGradesByStudentId[studentId] ?? []
  res.json(grades)
})

// POST /api/grades/by-student/:studentId
// TEACHER only
router.post("/by-student/:studentId", authenticate, (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { studentId } = req.params
  const { subject_id, term, score } = req.body as {
    subject_id?: string
    term?: string
    score?: number
  }

  if (!subject_id || !term || typeof score !== "number") {
    res.status(400).json({ message: "subject_id, term, and score are required" })
    return
  }

  const now = new Date()
  const newGrade = {
    _id: `grade-${Date.now()}`,
    student_id: studentId,
    subject_id,
    teacher_id: user._id,
    term,
    score,
    calculated_grade: calcGrade(score),
    createdAt: now,
    updatedAt: now,
  }

  demoGrades.push(newGrade)
  if (!demoGradesByStudentId[studentId]) demoGradesByStudentId[studentId] = []
  demoGradesByStudentId[studentId].push(newGrade)

  createNotification(
    studentId,
    "새 성적 등록",
    `${newGrade.subject_id.replace("subject-", "")} 과목 성적이 등록되었습니다. ${newGrade.score}점`
  )
  for (const u of Object.values(demoUsersById)) {
    if (u.role === "PARENT" && (u as IParentUser).children.includes(studentId)) {
      createNotification(u._id, "자녀 성적 업데이트", `학생 성적이 등록되었습니다.`)
    }
  }

  res.status(201).json(newGrade)
})

// PUT /api/grades/:gradeId
// TEACHER only, must own the grade (grade.teacher_id === user._id)
router.put("/:gradeId", authenticate, (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { gradeId } = req.params
  const gradeIndex = demoGrades.findIndex((g) => g._id === gradeId)

  if (gradeIndex === -1) {
    res.status(404).json({ message: "Grade not found" })
    return
  }

  const grade = demoGrades[gradeIndex]

  if (grade.teacher_id !== user._id) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { score } = req.body as { score?: number }

  if (typeof score === "number") {
    grade.score = score
    grade.calculated_grade = calcGrade(score)
  }

  grade.updatedAt = new Date()

  res.json(grade)
})

// DELETE /api/grades/:gradeId
// TEACHER only, must own the grade (grade.teacher_id === user._id)
router.delete("/:gradeId", authenticate, (req, res) => {
  const user = req.authUser!

  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { gradeId } = req.params
  const gradeIndex = demoGrades.findIndex((g) => g._id === gradeId)

  if (gradeIndex === -1) {
    res.status(404).json({ message: "Grade not found" })
    return
  }

  const grade = demoGrades[gradeIndex]

  if (grade.teacher_id !== user._id) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { student_id } = grade
  demoGrades.splice(gradeIndex, 1)

  if (demoGradesByStudentId[student_id]) {
    const studentGradeIndex = demoGradesByStudentId[student_id].findIndex((g) => g._id === gradeId)
    if (studentGradeIndex !== -1) {
      demoGradesByStudentId[student_id].splice(studentGradeIndex, 1)
    }
  }

  res.status(204).end()
})

export default router
