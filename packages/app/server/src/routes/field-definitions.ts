import { Router } from "express"
import { FieldDefinitionModel } from "@teacher-erp/shared-db"
import { authenticate } from "../middleware/authenticate.js"

const router = Router()
router.use(authenticate)

// GET /api/field-definitions
// TEACHER: 전체 (is_active 무관) | STUDENT/PARENT: visibility=PUBLIC & is_active=true
router.get("/", async (req, res) => {
  const user = req.authUser!
  const filter =
    user.role === "TEACHER"
      ? {}
      : { visibility: "PUBLIC", is_active: true }

  const fields = await FieldDefinitionModel.find(filter).sort({ createdAt: 1 }).lean()
  res.json({ fields })
})

// POST /api/field-definitions — TEACHER only
router.post("/", async (req, res) => {
  if (req.authUser?.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { field_id, label, field_type, visibility } = req.body as {
    field_id?: string
    label?: string
    field_type?: string
    visibility?: string
  }

  if (!field_id || !label) {
    res.status(400).json({ message: "field_id와 label은 필수입니다." })
    return
  }

  const slug = field_id.trim().toLowerCase().replace(/\s+/g, "_")
  const existing = await FieldDefinitionModel.findOne({ field_id: slug })
  if (existing) {
    res.status(409).json({ message: "이미 존재하는 field_id입니다." })
    return
  }

  const created = await FieldDefinitionModel.create({
    field_id: slug,
    label: label.trim(),
    field_type: field_type ?? "text",
    visibility: visibility ?? "TEACHER_ONLY",
    is_active: true,
    created_by: req.authUser!._id,
  })

  res.status(201).json({ field: created })
})

// PATCH /api/field-definitions/:fieldId — TEACHER only
router.patch("/:fieldId", async (req, res) => {
  if (req.authUser?.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { fieldId } = req.params
  const { label, visibility, is_active } = req.body as {
    label?: string
    visibility?: string
    is_active?: boolean
  }

  const update: Record<string, unknown> = {}
  if (label !== undefined) update["label"] = label.trim()
  if (visibility !== undefined) update["visibility"] = visibility
  if (is_active !== undefined) update["is_active"] = is_active

  const updated = await FieldDefinitionModel.findOneAndUpdate(
    { field_id: fieldId },
    { $set: update },
    { new: true },
  )

  if (!updated) {
    res.status(404).json({ message: "항목을 찾을 수 없습니다." })
    return
  }

  res.json({ field: updated })
})

export default router
