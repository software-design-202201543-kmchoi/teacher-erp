import { Router } from "express"
import { authenticate } from "../middleware/authenticate.js"
import { authorize } from "../middleware/authorize.js"

const router = Router()

router.get(
  "/",
  authenticate,
  authorize("read", "Grade"),
  (req, res) => {
    res.json({
      message: "성적 목록",
      requestedBy: req.authUser?._id,
      role: req.authUser?.role,
      grades: [],
    })
  }
)

export default router
