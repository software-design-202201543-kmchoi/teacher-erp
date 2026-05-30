import { Router } from "express"
import { authenticate } from "../middleware/authenticate.js"
import { getSnapshot, getAllSnapshots, getAllSummaries } from "../workers/olap-pipeline.js"

const router = Router()

// GET /api/analytics/students/:id/snapshot?term=2026-1
// Reads from the analytics collection — never touches operational collections.
// Omitting ?term returns all snapshots (used by the UI to populate term tabs).
// TEACHER only.
router.get("/students/:id/snapshot", authenticate, async (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  const studentId = req.params["id"] as string
  const { term } = req.query

  if (typeof term === "string" && term) {
    const snapshot = await getSnapshot(studentId, term)
    if (!snapshot) {
      res.status(404).json({ message: "Snapshot not found for this term" })
      return
    }
    res.json(snapshot)
    return
  }

  res.json(await getAllSnapshots(studentId))
})

// GET /api/analytics/students/:id/subject-progress
// Returns SubjectProgressSummary[] for all subjects. TEACHER only.
router.get("/students/:id/subject-progress", authenticate, async (req, res) => {
  const user = req.authUser!
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" })
    return
  }

  res.json(await getAllSummaries(req.params["id"] as string))
})

export default router
