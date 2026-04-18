import { Router } from "express"
import { demoNotificationsByUserId } from "@teacher-erp/shared-utils"
import { authenticate } from "../middleware/authenticate.js"

const router = Router()

// GET /api/notifications — 본인 알림 목록, 미읽음 우선 → 최신순
router.get("/", authenticate, (req, res) => {
  const user = req.authUser!
  let notifs = demoNotificationsByUserId[user._id] ?? []
  notifs = [...notifs].sort((a, b) => {
    // 미읽음 우선
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  res.json(notifs)
})

// POST /api/notifications/read-all — 전체 읽음 처리
// NOTE: must be defined before /:id/read to avoid route conflict
router.post("/read-all", authenticate, (req, res) => {
  const user = req.authUser!
  ;(demoNotificationsByUserId[user._id] ?? []).forEach((n) => {
    n.is_read = true
    n.updatedAt = new Date()
  })
  res.json({ ok: true })
})

// POST /api/notifications/:id/read — 읽음 처리
router.post("/:id/read", authenticate, (req, res) => {
  const user = req.authUser!
  const notif = (demoNotificationsByUserId[user._id] ?? []).find(
    (n) => n._id === req.params.id
  )
  if (!notif) {
    res.status(404).json({ message: "Not found" })
    return
  }
  notif.is_read = true
  notif.updatedAt = new Date()
  res.json(notif)
})

export default router
