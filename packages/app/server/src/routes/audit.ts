import { Router } from "express"
import { AuditLogModel } from "@teacher-erp/shared-db"
import { demoUsersById } from "@teacher-erp/shared-utils"
import { authenticate } from "../middleware/authenticate.js"

const router = Router()

// GET /api/audit/student/:studentId
// 특정 학생의 C/U/D 이력 조회 — TEACHER 전용
// Query: ?collection=grades|feedbacks|counselingrecords&limit=50&before=<ISO date>
router.get("/student/:studentId", authenticate, async (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const studentId = req.params["studentId"] as string
  const { collection, limit: limitStr, before } = req.query

  const filter: Record<string, unknown> = { student_id: studentId }
  if (typeof collection === "string" && collection) {
    filter["collection"] = collection
  }
  if (typeof before === "string" && before) {
    filter["occurred_at"] = { $lt: new Date(before) }
  }

  const limit = Math.min(Number(limitStr) || 50, 100)

  const entries = await AuditLogModel.find(filter)
    .sort({ occurred_at: -1 })
    .limit(limit)
    .lean()

  const total = await AuditLogModel.countDocuments(filter)

  // actor 이름 보강
  const enriched = entries.map((e) => ({
    ...e,
    actor_name: demoUsersById[e.actor_id]?.name ?? e.actor_id,
  }))

  res.json({ entries: enriched, total })
})

export default router
