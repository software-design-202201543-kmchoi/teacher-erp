import { Router } from "express"
import { authenticate } from "../middleware/authenticate.js"
import { authorize } from "../middleware/authorize.js"

const router = Router()

router.get(
  "/",
  authenticate,
  authorize("manage", "Counseling", (req) => ({ teacher_id: req.authUser?._id })),
  (req, res) => {
    res.json({
      message: "상담 목록",
      requestedBy: req.authUser?._id,
      role: req.authUser?.role,
      records: [],
    })
  }
)

export default router
