import { Router } from "express"
import type { Request, Response } from "express"
import { createHash } from "crypto"
import type mongoose from "mongoose"
import {
  UserModel,
  TeacherModel,
  StudentModel,
  ParentModel,
  ParentStudentModel,
} from "@teacher-erp/shared-db"
import type {
  AdminUserListResponse,
  AdminUserResponse,
  CreateUserInput,
  UpdateUserInput,
  ApiErrorResponse,
} from "@teacher-erp/shared-types"
import { authenticate } from "../middleware/authenticate.js"
import { writeAuditLog } from "../utils/auditLog.js"
import type { Role } from "@teacher-erp/shared-types"

type UserDoc = {
  _id: { toString(): string }
  email: string
  name: string
  role: Role
  passwordHash?: string
  [key: string]: unknown
}

const router = Router()
router.use(authenticate)

function requireTeacher(req: Request, res: Response): boolean {
  if (req.authUser?.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden: TEACHER 전용" })
    return false
  }
  return true
}

// GET /api/admin/users?role=STUDENT&page=1&limit=20
router.get("/users", async (req, res) => {
  if (!requireTeacher(req, res)) return

  const { role, page: pageStr, limit: limitStr } = req.query
  const page = Math.max(1, Number(pageStr) || 1)
  const limit = Math.min(100, Math.max(1, Number(limitStr) || 50))
  const filter: Record<string, unknown> = {}
  if (typeof role === "string" && role) filter["role"] = role

  const [users, total] = await Promise.all([
    UserModel.find(filter, { passwordHash: 0 })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(filter),
  ])

  const response: AdminUserListResponse = { users: users as never, total }
  res.json(response)
})

// POST /api/admin/users
router.post("/users", async (req, res) => {
  if (!requireTeacher(req, res)) return

  const body: CreateUserInput = req.body as CreateUserInput
  const { email, name, role, password, grade_level, class_num, student_num, subjects_taught } = body

  if (!email || !name || !role || !password) {
    const err: ApiErrorResponse = { message: "email, name, role, password는 필수입니다." }
    res.status(400).json(err)
    return
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase() })
  if (existing) {
    res.status(409).json({ message: "이미 존재하는 이메일입니다." })
    return
  }

  const passwordHash = createHash("sha256").update(password).digest("hex")
  let created

  if (role === "TEACHER") {
    created = await TeacherModel.create({ email: email.toLowerCase(), name, passwordHash, subjects_taught: subjects_taught ?? [] })
  } else if (role === "STUDENT") {
    if (!grade_level || !class_num || !student_num) {
      res.status(400).json({ message: "학생은 grade_level, class_num, student_num이 필요합니다." })
      return
    }
    created = await StudentModel.create({ email: email.toLowerCase(), name, passwordHash, grade_level, class_num, student_num })
  } else if (role === "PARENT") {
    created = await ParentModel.create({ email: email.toLowerCase(), name, passwordHash, children: [] })
  } else {
    res.status(400).json({ message: "role은 TEACHER | STUDENT | PARENT 중 하나여야 합니다." })
    return
  }

  await writeAuditLog({
    collection: "users",
    doc_id: String(created._id),
    student_id: role === "STUDENT" ? String(created._id) : "N/A",
    operation: "create",
    actor_id: req.authUser!._id,
    after: { email: created.email, name: created.name, role },
  })

  const response: AdminUserResponse = { user: { ...created.toObject(), passwordHash: undefined } as never }
  res.status(201).json(response)
})

// PATCH /api/admin/users/:id
router.patch("/users/:id", async (req, res) => {
  if (!requireTeacher(req, res)) return

  const { id } = req.params
  const body: UpdateUserInput = req.body as UpdateUserInput

  const existing = await UserModel.findById(id, { passwordHash: 0 }).lean<UserDoc>()
  if (!existing) {
    res.status(404).json({ message: "사용자를 찾을 수 없습니다." })
    return
  }

  const update: Record<string, unknown> = {}
  if (body.name) update["name"] = body.name
  if (body.grade_level !== undefined) update["grade_level"] = body.grade_level
  if (body.class_num !== undefined) update["class_num"] = body.class_num
  if (body.student_num !== undefined) update["student_num"] = body.student_num
  if (body.subjects_taught !== undefined) update["subjects_taught"] = body.subjects_taught

  const before = { ...existing }

  if (body.role && body.role !== existing.role) {
    // 역할 변경: discriminator 변경은 MongoDB에서 직접 지원하지 않으므로 delete & recreate
    // passwordHash를 먼저 읽은 뒤 삭제해야 한다
    const withHash = await UserModel.findById(id).select("+passwordHash").lean<UserDoc>()
    const passwordHash = withHash?.passwordHash ?? ""
    await UserModel.deleteOne({ _id: id })
    let recreated
    if (body.role === "TEACHER") {
      recreated = await TeacherModel.create({ _id: id, email: existing.email, name: body.name ?? existing.name, passwordHash, subjects_taught: body.subjects_taught ?? [] })
    } else if (body.role === "STUDENT") {
      recreated = await StudentModel.create({ _id: id, email: existing.email, name: body.name ?? existing.name, passwordHash, grade_level: body.grade_level ?? 1, class_num: body.class_num ?? 1, student_num: body.student_num ?? 1 })
    } else {
      recreated = await ParentModel.create({ _id: id, email: existing.email, name: body.name ?? existing.name, passwordHash, children: [] })
    }
    await writeAuditLog({
      collection: "users",
      doc_id: id,
      student_id: "N/A",
      operation: "update",
      actor_id: req.authUser!._id,
      before: { role: existing.role },
      after: { role: body.role },
    })
    res.json({ user: { ...recreated.toObject(), passwordHash: undefined } as never })
    return
  }

  const updated = await UserModel.findByIdAndUpdate(id, { $set: update }, { new: true, projection: { passwordHash: 0 } }).lean()

  await writeAuditLog({
    collection: "users",
    doc_id: id,
    student_id: existing.role === "STUDENT" ? id : "N/A",
    operation: "update",
    actor_id: req.authUser!._id,
    before,
    after: update,
  })

  res.json({ user: updated as never })
})

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  if (!requireTeacher(req, res)) return

  const { id } = req.params
  if (id === req.authUser!._id) {
    res.status(400).json({ message: "본인 계정은 삭제할 수 없습니다." })
    return
  }

  const existing = await UserModel.findById(id, { passwordHash: 0 }).lean<UserDoc>()
  if (!existing) {
    res.status(404).json({ message: "사용자를 찾을 수 없습니다." })
    return
  }

  await UserModel.deleteOne({ _id: id })
  await ParentStudentModel.deleteMany({ $or: [{ parent_id: id }, { student_id: id }] })

  await writeAuditLog({
    collection: "users",
    doc_id: id,
    student_id: existing.role === "STUDENT" ? id : "N/A",
    operation: "delete",
    actor_id: req.authUser!._id,
    before: { email: existing.email, name: existing.name, role: existing.role },
  })

  res.status(204).end()
})

// POST /api/admin/users/:id/parent-links
router.post("/users/:id/parent-links", async (req, res) => {
  if (!requireTeacher(req, res)) return

  const { id: parentId } = req.params
  const { studentId } = req.body as { studentId?: string }

  if (!studentId) {
    res.status(400).json({ message: "studentId가 필요합니다." })
    return
  }

  const [parent, student] = await Promise.all([
    UserModel.findOne({ _id: parentId, role: "PARENT" }).lean(),
    UserModel.findOne({ _id: studentId, role: "STUDENT" }).lean(),
  ])
  if (!parent) { res.status(404).json({ message: "학부모를 찾을 수 없습니다." }); return }
  if (!student) { res.status(404).json({ message: "학생을 찾을 수 없습니다." }); return }

  await ParentStudentModel.findOneAndUpdate(
    { parent_id: parentId, student_id: studentId },
    { parent_id: parentId, student_id: studentId },
    { upsert: true },
  )
  // ParentModel.children 배열도 동기화
  await ParentModel.updateOne({ _id: parentId }, { $addToSet: { children: studentId } })

  res.status(201).json({ message: "학부모-자녀 연결 완료" })
})

// DELETE /api/admin/users/:id/parent-links/:studentId
router.delete("/users/:id/parent-links/:studentId", async (req, res) => {
  if (!requireTeacher(req, res)) return

  const { id: parentId, studentId } = req.params

  await ParentStudentModel.deleteOne({ parent_id: parentId, student_id: studentId })
  await ParentModel.updateOne({ _id: parentId }, { $pull: { children: studentId } })

  res.status(204).end()
})

export default router
