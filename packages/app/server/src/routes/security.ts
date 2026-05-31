import { Router } from "express"
import { SecurityEventModel } from "@teacher-erp/shared-db"
import { authenticate } from "../middleware/authenticate.js"

const router = Router()

router.use(authenticate)

// GET /api/security/events — TEACHER only
router.get("/events", async (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const { type, limit: limitStr, before } = req.query
  const filter: Record<string, unknown> = {}
  if (typeof type === "string" && type) filter["type"] = type
  if (typeof before === "string" && before) filter["occurred_at"] = { $lt: new Date(before) }

  const limit = Math.min(Number(limitStr) || 50, 200)
  const events = await SecurityEventModel.find(filter).sort({ occurred_at: -1 }).limit(limit).lean()
  const total = await SecurityEventModel.countDocuments(filter)
  res.json({ events, total })
})

export default router

