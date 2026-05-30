/**
 * OLAP Pipeline — MongoDB Change Streams
 *
 * Design decision — Change Streams vs. polling vs. application-level triggers:
 *
 *   A. Application triggers (previous approach): route handlers call notify*()
 *      after every mutation. Simple but couples the pipeline to every write path.
 *      Any write that bypasses the route (migrations, direct DB tools, replicas)
 *      silently skips analytics. Rejected.
 *
 *   B. Polling (scheduled read): a cron reads operational collections and diffs
 *      against the last-seen state. Simple, but introduces latency proportional
 *      to the poll interval and wastes reads when nothing changed. Rejected for
 *      primary mechanism; kept as a nightly reconciliation backfill.
 *
 *   C. MongoDB Change Streams (chosen): the DB itself emits events on every
 *      committed write via the oplog. The pipeline subscribes once at startup
 *      and reacts to insert/update/replace/delete events in near-real time.
 *      Decoupled from route code — any write path (API, seed, admin tool) is
 *      captured. Requires a Replica Set (oplog), which MongoMemoryReplSet
 *      provides in dev and MongoDB Atlas provides in production.
 *
 * Why NOT Apache Kafka here:
 *   Kafka would add a broker, ZooKeeper/KRaft, producers, consumer groups, and
 *   schema registry to a student demo project. Change Streams give the same
 *   event-driven guarantee within the existing MongoDB infrastructure at zero
 *   extra operational cost. Kafka becomes the right choice when events need to
 *   be fanned out across multiple heterogeneous consumers or replayed by external
 *   systems — neither of which applies here.
 *
 * Pipeline lifecycle:
 *   1. seedDatabase()        — writes demo data to MongoDB
 *   2. bootstrapAnalytics()  — full aggregation from seeded data (no streams yet)
 *   3. startOlapPipeline()   — opens Change Streams for future mutations
 *   4. nightly backfill      — reconciles any missed events (setInterval 24h)
 */

import mongoose, { Schema } from "mongoose"

type ChangeEvent = {
  operationType: string
  fullDocument?: Record<string, unknown>
  documentKey: { _id: unknown }
}
import {
  demoAcademicRecordsByStudentId,
  demoUsers,
  calcAverage,
  calcGrade,
} from "@teacher-erp/shared-utils"
import type {
  StudentLearningSnapshot,
  SubjectProgressSummary,
  Trend,
} from "@teacher-erp/shared-types"
import { GradeDoc } from "../models/grade.js"
import { FeedbackDoc } from "../models/feedback.js"
import { CounselingDoc } from "../models/counseling.js"

// ── Analytics Mongoose models ─────────────────────────────────────────────────

const subjectScoreSchema = new Schema(
  { subject_id: String, subject_name: String, score: Number, grade: String },
  { _id: false },
)

const snapshotSchema = new Schema(
  {
    student_id: { type: String, required: true },
    term: { type: String, required: true },
    avg_score: { type: Number, default: 0 },
    overall_grade: { type: String, default: "-" },
    subject_scores: { type: [subjectScoreSchema], default: [] },
    attendance_summary: { type: String, default: "-" },
    feedback_count: { type: Number, default: 0 },
    counseling_count: { type: Number, default: 0 },
    snapshot_at: { type: Date },
  },
  { timestamps: false },
)
snapshotSchema.index({ student_id: 1, term: 1 }, { unique: true })

const scoreHistorySchema = new Schema(
  { term: String, score: Number, grade: String },
  { _id: false },
)

const summarySchema = new Schema(
  {
    student_id: { type: String, required: true },
    subject_id: { type: String, required: true },
    score_history: { type: [scoreHistorySchema], default: [] },
    avg_score: { type: Number, default: 0 },
    trend: { type: String, enum: ["UP", "DOWN", "STABLE"], default: "STABLE" },
    last_updated_at: { type: Date },
  },
  { timestamps: false },
)
summarySchema.index({ student_id: 1, subject_id: 1 }, { unique: true })

const SnapshotModel =
  (mongoose.models["StudentLearningSnapshot"] as mongoose.Model<StudentLearningSnapshot>) ??
  mongoose.model<StudentLearningSnapshot>("StudentLearningSnapshot", snapshotSchema)

const SummaryModel =
  (mongoose.models["SubjectProgressSummary"] as mongoose.Model<SubjectProgressSummary>) ??
  mongoose.model<SubjectProgressSummary>("SubjectProgressSummary", summarySchema)

// ── ID context maps (used to reconstruct student context on delete events) ────
// Change Streams for deletes only provide the document _id; these maps let us
// look up the associated student_id/term/subject_id without pre/post images.

const gradeCtx = new Map<string, { student_id: string; term: string; subject_id: string }>()
const feedbackCtx = new Map<string, string>() // feedbackId → student_id
const counselingCtx = new Map<string, string>() // recordId → student_id

// ── Aggregation functions ─────────────────────────────────────────────────────

async function aggregateSnapshot(studentId: string, term: string): Promise<void> {
  const grades = await GradeDoc.find({ student_id: studentId, term }).lean()
  const scores = grades.map((g) => g.score)
  const avg = calcAverage(scores)
  const overallGrade = scores.length > 0 ? calcGrade(avg) : "-"

  const subjectScores = grades.map((g) => ({
    subject_id: g.subject_id,
    subject_name: g.subject_id.replace(/^subject-/, ""),
    score: g.score,
    grade: g.calculated_grade,
  }))

  const record = demoAcademicRecordsByStudentId[studentId]
  const att = record?.attendance_info
  const attendanceSummary = att
    ? `결석 ${att.absences}일 · 지각 ${att.tardies}회 · 조퇴 ${att.earlyLeaves}회`
    : "-"

  const feedbackCount = await FeedbackDoc.countDocuments({ student_id: studentId })

  const year = term.split("-")[0]!
  const counselingCount = await CounselingDoc.countDocuments({
    student_id: studentId,
    counsel_date: { $regex: `^${year}` },
  })

  await SnapshotModel.findOneAndUpdate(
    { student_id: studentId, term },
    {
      avg_score: avg,
      overall_grade: overallGrade,
      subject_scores: subjectScores,
      attendance_summary: attendanceSummary,
      feedback_count: feedbackCount,
      counseling_count: counselingCount,
      snapshot_at: new Date(),
    },
    { upsert: true, new: true },
  )
}

async function aggregateSubjectSummary(studentId: string, subjectId: string): Promise<void> {
  const grades = await GradeDoc.find({ student_id: studentId, subject_id: subjectId })
    .sort({ term: 1 })
    .lean()

  const scoreHistory = grades.map((g) => ({
    term: g.term,
    score: g.score,
    grade: g.calculated_grade,
  }))

  const avg = calcAverage(grades.map((g) => g.score))

  let trend: Trend = "STABLE"
  if (scoreHistory.length >= 2) {
    const last = scoreHistory[scoreHistory.length - 1]!.score
    const prev = scoreHistory[scoreHistory.length - 2]!.score
    if (last > prev + 2) trend = "UP"
    else if (last < prev - 2) trend = "DOWN"
  }

  await SummaryModel.findOneAndUpdate(
    { student_id: studentId, subject_id: subjectId },
    { score_history: scoreHistory, avg_score: avg, trend, last_updated_at: new Date() },
    { upsert: true, new: true },
  )
}

async function aggregateAllSnapshots(studentId: string): Promise<void> {
  const terms = await GradeDoc.distinct("term", { student_id: studentId })
  await Promise.all(terms.map((term: string) => aggregateSnapshot(studentId, term)))
}

async function aggregateAll(): Promise<void> {
  const studentIds = demoUsers.filter((u) => u.role === "STUDENT").map((u) => u._id)
  const allSubjectIds = await GradeDoc.distinct("subject_id")

  // Rebuild context maps
  const allGrades = await GradeDoc.find({}).lean()
  gradeCtx.clear()
  for (const g of allGrades) {
    gradeCtx.set(g._id as string, {
      student_id: g.student_id,
      term: g.term,
      subject_id: g.subject_id,
    })
  }

  const allFeedbacks = await FeedbackDoc.find({}).lean()
  feedbackCtx.clear()
  for (const f of allFeedbacks) feedbackCtx.set(f._id as string, f.student_id)

  const allCounseling = await CounselingDoc.find({}).lean()
  counselingCtx.clear()
  for (const c of allCounseling) counselingCtx.set(c._id as string, c.student_id)

  // Clear analytics and recompute
  await Promise.all([SnapshotModel.deleteMany({}), SummaryModel.deleteMany({})])

  for (const studentId of studentIds) {
    const terms = await GradeDoc.distinct("term", { student_id: studentId })
    await Promise.all(terms.map((t: string) => aggregateSnapshot(studentId, t)))
    await Promise.all(
      (allSubjectIds as string[]).map((sid) => aggregateSubjectSummary(studentId, sid)),
    )
  }
}

// ── Change Stream handlers ────────────────────────────────────────────────────

function watchGrades(): void {
  const stream = GradeDoc.watch([], { fullDocument: "updateLookup" })

  stream.on("change", (event: ChangeEvent) => {
    void (async () => {
      if (
        event.operationType === "insert" ||
        event.operationType === "update" ||
        event.operationType === "replace"
      ) {
        const doc = event.fullDocument as {
          _id: string
          student_id: string
          term: string
          subject_id: string
        }
        if (!doc) return
        // Update context map
        gradeCtx.set(doc._id, {
          student_id: doc.student_id,
          term: doc.term,
          subject_id: doc.subject_id,
        })
        await aggregateSnapshot(doc.student_id, doc.term)
        await aggregateSubjectSummary(doc.student_id, doc.subject_id)
      } else if (event.operationType === "delete") {
        const gradeId = event.documentKey._id as string
        const ctx = gradeCtx.get(gradeId)
        if (!ctx) return
        gradeCtx.delete(gradeId)
        await aggregateSnapshot(ctx.student_id, ctx.term)
        await aggregateSubjectSummary(ctx.student_id, ctx.subject_id)
      }
    })()
  })

  stream.on("error", (err) => console.error("[OLAP] Grade stream error:", err))
}

function watchFeedback(): void {
  const stream = FeedbackDoc.watch([], { fullDocument: "updateLookup" })

  stream.on("change", (event: ChangeEvent) => {
    void (async () => {
      let studentId: string | undefined

      if (
        event.operationType === "insert" ||
        event.operationType === "update" ||
        event.operationType === "replace"
      ) {
        const doc = event.fullDocument as { _id: string; student_id: string }
        if (!doc) return
        feedbackCtx.set(doc._id, doc.student_id)
        studentId = doc.student_id
      } else if (event.operationType === "delete") {
        const id = event.documentKey._id as string
        studentId = feedbackCtx.get(id)
        feedbackCtx.delete(id)
      }

      if (studentId) await aggregateAllSnapshots(studentId)
    })()
  })

  stream.on("error", (err) => console.error("[OLAP] Feedback stream error:", err))
}

function watchCounseling(): void {
  const stream = CounselingDoc.watch([], { fullDocument: "updateLookup" })

  stream.on("change", (event: ChangeEvent) => {
    void (async () => {
      let studentId: string | undefined

      if (
        event.operationType === "insert" ||
        event.operationType === "update" ||
        event.operationType === "replace"
      ) {
        const doc = event.fullDocument as { _id: string; student_id: string }
        if (!doc) return
        counselingCtx.set(doc._id, doc.student_id)
        studentId = doc.student_id
      } else if (event.operationType === "delete") {
        const id = event.documentKey._id as string
        studentId = counselingCtx.get(id)
        counselingCtx.delete(id)
      }

      if (studentId) await aggregateAllSnapshots(studentId)
    })()
  })

  stream.on("error", (err) => console.error("[OLAP] Counseling stream error:", err))
}

// ── Public read API (used by analytics routes) ────────────────────────────────

export async function getSnapshot(
  studentId: string,
  term: string,
): Promise<StudentLearningSnapshot | null> {
  return SnapshotModel.findOne({ student_id: studentId, term }).lean()
}

export async function getAllSnapshots(studentId: string): Promise<StudentLearningSnapshot[]> {
  return SnapshotModel.find({ student_id: studentId }).sort({ term: 1 }).lean()
}

export async function getAllSummaries(studentId: string): Promise<SubjectProgressSummary[]> {
  return SummaryModel.find({ student_id: studentId }).sort({ subject_id: 1 }).lean()
}

// ── Bootstrap & start ─────────────────────────────────────────────────────────

export async function startOlapPipeline(): Promise<void> {
  await aggregateAll()
  console.log("[OLAP] Bootstrap analytics complete")

  watchGrades()
  watchFeedback()
  watchCounseling()
  console.log("[OLAP] Change Streams active on grades, feedbacks, counselingrecords")

  // Nightly reconciliation backfill — catches any event the stream missed
  // (e.g. stream error during a transient network blip).
  // In production replace setInterval with node-cron: schedule.schedule("0 2 * * *", ...)
  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  setInterval(() => {
    void aggregateAll().then(() => console.log("[OLAP] Nightly backfill complete"))
  }, ONE_DAY_MS)
}
