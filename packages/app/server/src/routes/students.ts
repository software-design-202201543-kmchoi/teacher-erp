import { Router } from "express"
import type { IStudentUser, IParentUser } from "@teacher-erp/shared-types"
import { FieldDefinitionModel } from "@teacher-erp/shared-db"
import type {
  BatchStudentInput,
  BatchCreatedResult,
  BatchFailedResult,
  ParentLinkInput,
  ParentLinkResult,
} from "@teacher-erp/shared-types"
import {
  demoUsers,
  demoUsersById,
  demoAcademicRecordsByStudentId,
  validateBatchRow,
  autoGenerateEmail,
  generateTempPassword,
} from "@teacher-erp/shared-utils"
import { authenticate } from "../middleware/authenticate.js"
import { demoAuthAccounts } from "../data/authAccounts.js"
import { createNotification } from "../utils/createNotification.js"

function autoGenerateParentEmail(grade: number, cls: number, num: number): string {
  const year = new Date().getFullYear() - grade + 1
  return `parent.${year}${grade}${String(cls).padStart(2, "0")}${String(num).padStart(2, "0")}@school.local`
}

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
router.get("/:id/academic-record", async (req, res) => {
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

  // STUDENT/PARENT는 PUBLIC 항목만 custom_fields에서 조회
  const allFields = await FieldDefinitionModel.find({}).lean()
  const visibleFieldIds =
    req.authUser.role === "TEACHER"
      ? new Set(allFields.map((f) => f.field_id))
      : new Set(allFields.filter((f) => f.visibility === "PUBLIC" && f.is_active).map((f) => f.field_id))

  const rawCustom = (record as unknown as Record<string, unknown>).custom_fields as Record<string, string> | undefined
  const custom_fields = rawCustom
    ? Object.fromEntries(Object.entries(rawCustom).filter(([k]) => visibleFieldIds.has(k)))
    : {}

  res.json({ academicRecord: { ...record, custom_fields }, fieldDefinitions: allFields.filter((f) => visibleFieldIds.has(f.field_id)) })
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

  const { attendance_info, special_notes, custom_fields } = req.body as {
    attendance_info?: {
      absences?: number
      tardies?: number
      earlyLeaves?: number
    }
    special_notes?: string
    custom_fields?: Record<string, string>
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

  if (custom_fields !== undefined) {
    const rec = record as unknown as Record<string, unknown>
    const existing = rec.custom_fields as Record<string, string> | undefined ?? {}
    rec.custom_fields = { ...existing, ...custom_fields }
  }

  record.updatedAt = new Date()

  res.json({ academicRecord: record })
})

// GET /:id/parents — 학생에 연결된 학부모 목록 (TEACHER only)
router.get("/:id/parents", (req, res) => {
  if (req.authUser?.role !== "TEACHER") { res.status(403).json({ message: "Forbidden" }); return }
  const student = demoUsersById[req.params.id]
  if (!student || student.role !== "STUDENT") { res.status(404).json({ message: "Student not found" }); return }
  const parents = demoUsers.filter(
    (u): u is IParentUser => u.role === "PARENT" && u.children.includes(req.params.id)
  )
  res.json({ parents })
})

// POST /:id/parents — 학부모 연결 또는 신규 생성 (TEACHER only)
router.post("/:id/parents", (req, res) => {
  if (req.authUser?.role !== "TEACHER") { res.status(403).json({ message: "Forbidden" }); return }
  const studentId = req.params.id
  const student = demoUsersById[studentId]
  if (!student || student.role !== "STUDENT") { res.status(404).json({ message: "Student not found" }); return }

  const { email, name } = req.body as ParentLinkInput
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ message: "유효한 이메일을 입력하세요" }); return
  }

  const emailLower = email.toLowerCase()
  const existing = demoUsers.find(
    (u): u is IParentUser => u.role === "PARENT" && u.email.toLowerCase() === emailLower
  )

  let result: ParentLinkResult
  if (existing) {
    if (!existing.children.includes(studentId)) existing.children.push(studentId)
    result = { parent: existing, tempPassword: "", isNew: false }
  } else {
    const tempPassword = generateTempPassword()
    const s = student as IStudentUser
    const newParent: IParentUser = {
      _id: `parent-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email: emailLower,
      name: name?.trim() || `${s.name} 학부모`,
      role: "PARENT",
      children: [studentId],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    demoUsers.push(newParent)
    demoUsersById[newParent._id] = newParent
    demoAuthAccounts.push({ role: "PARENT", email: emailLower, password: tempPassword, userId: newParent._id })
    result = { parent: newParent, tempPassword, isNew: true }
  }

  res.status(existing ? 200 : 201).json(result)
})

// DELETE /:id/parents/:parentId — 학부모 연결 해제 (TEACHER only)
router.delete("/:id/parents/:parentId", (req, res) => {
  if (req.authUser?.role !== "TEACHER") { res.status(403).json({ message: "Forbidden" }); return }
  const { id: studentId, parentId } = req.params
  const parent = demoUsers.find(
    (u): u is IParentUser => u.role === "PARENT" && u._id === parentId
  )
  if (!parent) { res.status(404).json({ message: "Parent not found" }); return }
  parent.children = parent.children.filter((c) => c !== studentId)
  res.json({ ok: true })
})

const BATCH_MAX = 200

// POST /batch — TEACHER only, partial-success (207)
router.post("/batch", (req, res) => {
  if (!req.ability || !req.authUser) {
    res.status(401).json({ message: "Unauthenticated" })
    return
  }
  if (req.authUser.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const body = req.body as { students?: unknown }
  if (!Array.isArray(body.students) || body.students.length === 0) {
    res.status(400).json({ message: "students 배열이 필요합니다" })
    return
  }
  if (body.students.length > BATCH_MAX) {
    res.status(400).json({ message: `한 번에 최대 ${BATCH_MAX}명까지 등록할 수 있습니다` })
    return
  }

  const inputs = body.students as BatchStudentInput[]
  const created: BatchCreatedResult[] = []
  const failed: BatchFailedResult[] = []

  // Track duplicates within this request before touching the store
  const seenKeys = new Set<string>()
  const seenEmails = new Set<string>()

  for (const input of inputs) {
    const errors = validateBatchRow(input)
    if (errors.length > 0) {
      failed.push({ input, reason: errors.join(", ") })
      continue
    }

    const gradeLevel = Number(input.grade_level)
    const classNum = Number(input.class_num)
    const studentNum = Number(input.student_num)

    // Intra-request duplicate check (학번 조합)
    const key = `${gradeLevel}-${classNum}-${studentNum}`
    if (seenKeys.has(key)) {
      failed.push({ input, reason: `요청 내 중복: ${gradeLevel}학년 ${classNum}반 ${studentNum}번` })
      continue
    }

    const email = input.email?.trim() || autoGenerateEmail(gradeLevel, classNum, studentNum)
    const emailLower = email.toLowerCase()

    // Intra-request email duplicate check
    if (seenEmails.has(emailLower)) {
      failed.push({ input, reason: `요청 내 이메일 중복: ${email}` })
      continue
    }

    // Store-level email duplicate check (equivalent to DB unique index on email)
    if (demoUsers.some((u) => u.email.toLowerCase() === emailLower)) {
      failed.push({ input, reason: `이미 사용 중인 이메일: ${email}` })
      continue
    }

    // Store-level (학년, 반, 번호) unique check (equivalent to DB composite unique index)
    if (
      demoUsers.some(
        (u) =>
          u.role === "STUDENT" &&
          (u as IStudentUser).grade_level === gradeLevel &&
          (u as IStudentUser).class_num === classNum &&
          (u as IStudentUser).student_num === studentNum
      )
    ) {
      failed.push({ input, reason: `이미 등록된 학번: ${gradeLevel}학년 ${classNum}반 ${studentNum}번` })
      continue
    }

    const tempPassword = input.password?.trim() || generateTempPassword()

    const newStudent: IStudentUser = {
      _id: `student-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email,
      name: input.name.trim(),
      role: "STUDENT",
      grade_level: gradeLevel,
      class_num: classNum,
      student_num: studentNum,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Persist student
    demoUsers.push(newStudent)
    demoUsersById[newStudent._id] = newStudent
    demoAuthAccounts.push({ role: "STUDENT", email, password: tempPassword, userId: newStudent._id })

    seenKeys.add(key)
    seenEmails.add(emailLower)

    // 학부모 생성 또는 연결
    let parentResult: BatchCreatedResult["parent"] | undefined
    const pName = input.parent_name?.trim()
    const pEmail = (input.parent_email?.trim() || (pName ? autoGenerateParentEmail(gradeLevel, classNum, studentNum) : "")).toLowerCase()

    if (pEmail) {
      const existing = demoUsers.find(
        (u): u is IParentUser => u.role === "PARENT" && u.email.toLowerCase() === pEmail
      )
      if (existing) {
        if (!existing.children.includes(newStudent._id)) {
          existing.children.push(newStudent._id)
        }
        parentResult = { user: existing, tempPassword: "", isNew: false }
      } else {
        const parentPw = generateTempPassword()
        const newParent: IParentUser = {
          _id: `parent-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          email: pEmail,
          name: pName || `${newStudent.name} 학부모`,
          role: "PARENT",
          children: [newStudent._id],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        demoUsers.push(newParent)
        demoUsersById[newParent._id] = newParent
        demoAuthAccounts.push({ role: "PARENT", email: pEmail, password: parentPw, userId: newParent._id })
        parentResult = { user: newParent, tempPassword: parentPw, isNew: true }
      }
    }

    const createdEntry: BatchCreatedResult = { student: newStudent, tempPassword }
    if (parentResult) createdEntry.parent = parentResult
    created.push(createdEntry)
  }

  // Best-effort summary notification — failure here must never block the response
  if (created.length > 0) {
    try {
      createNotification(
        req.authUser._id,
        "학생 계정 일괄 등록 완료",
        `${created.length}명 등록 완료${failed.length > 0 ? `, ${failed.length}명 실패` : ""}`
      )
    } catch (err) {
      console.error("[batch-create] notification failed:", err)
    }
  }

  res.status(207).json({ created, failed })
})

export default router
