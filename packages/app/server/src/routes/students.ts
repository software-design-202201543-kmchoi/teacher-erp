import { Router } from "express"
import type { IStudentUser } from "@teacher-erp/shared-types"
import {
  demoUsers,
  demoUsersById,
  demoAcademicRecordsByStudentId,
} from "@teacher-erp/shared-utils"
import { authenticate } from "../middleware/authenticate.js"

const router = Router()

router.use(authenticate)

// GET / — TEACHER only: list all students
router.get("/", (req, res) => {
  if (!req.ability || !req.authUser) {
    res.status(401).json({ message: "Unauthenticated" })
    return
  }

  if (!req.ability.can("read", "Student")) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const students = demoUsers.filter((u): u is IStudentUser => u.role === "STUDENT")
  res.json({ students })
})

// GET /:id — TEACHER, the student themselves, or the student's parent
router.get("/:id", (req, res) => {
  if (!req.ability || !req.authUser) {
    res.status(401).json({ message: "Unauthenticated" })
    return
  }

  const { id } = req.params
  const targetUser = demoUsersById[id]

  if (!targetUser || targetUser.role !== "STUDENT") {
    res.status(404).json({ message: "Student not found" })
    return
  }

  const subjectInstance = { __t: "Student" as const, _id: id }
  if (!req.ability.can("read", subjectInstance as never)) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  res.json({ student: targetUser })
})

// GET /:id/academic-record — same access control as GET /:id
router.get("/:id/academic-record", (req, res) => {
  if (!req.ability || !req.authUser) {
    res.status(401).json({ message: "Unauthenticated" })
    return
  }

  const { id } = req.params
  const targetUser = demoUsersById[id]

  if (!targetUser || targetUser.role !== "STUDENT") {
    res.status(404).json({ message: "Student not found" })
    return
  }

  const subjectInstance = { __t: "Student" as const, _id: id }
  if (!req.ability.can("read", subjectInstance as never)) {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const record = demoAcademicRecordsByStudentId[id]
  if (!record) {
    res.status(404).json({ message: "Academic record not found" })
    return
  }

  res.json({ academicRecord: record })
})

// PUT /:id/academic-record — TEACHER only
router.put("/:id/academic-record", (req, res) => {
  if (!req.ability || !req.authUser) {
    res.status(401).json({ message: "Unauthenticated" })
    return
  }

  if (req.authUser.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { id } = req.params
  const targetUser = demoUsersById[id]

  if (!targetUser || targetUser.role !== "STUDENT") {
    res.status(404).json({ message: "Student not found" })
    return
  }

  const record = demoAcademicRecordsByStudentId[id]
  if (!record) {
    res.status(404).json({ message: "Academic record not found" })
    return
  }

  const { attendance_info, special_notes } = req.body as {
    attendance_info?: {
      absences?: number
      tardies?: number
      earlyLeaves?: number
    }
    special_notes?: string
  }

  if (attendance_info !== undefined) {
    if (attendance_info.absences !== undefined) {
      record.attendance_info.absences = attendance_info.absences
    }
    if (attendance_info.tardies !== undefined) {
      record.attendance_info.tardies = attendance_info.tardies
    }
    if (attendance_info.earlyLeaves !== undefined) {
      record.attendance_info.earlyLeaves = attendance_info.earlyLeaves
    }
  }

  if (special_notes !== undefined) {
    record.special_notes = special_notes
  }

  record.updatedAt = new Date()

  res.json({ academicRecord: record })
})

export default router
