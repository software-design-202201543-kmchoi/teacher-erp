/**
 * Operational Grade model — String IDs to match the demo data layer.
 *
 * Why String _id instead of ObjectId:
 *   The entire auth system and client use string IDs ("student-1", "teacher-1").
 *   Switching to ObjectId would require migrating auth, JWT payloads, and every
 *   client fetch. For this phase the string-ID operational model is consistent
 *   and functionally equivalent; Change Streams do not care about _id type.
 */
import mongoose, { Schema } from "mongoose"
import type { IGrade } from "@teacher-erp/shared-types"

const schema = new Schema<IGrade>(
  {
    _id: { type: String, required: true },
    student_id: { type: String, required: true },
    subject_id: { type: String, required: true },
    teacher_id: { type: String, required: true },
    term: { type: String, required: true },
    score: { type: Number, required: true },
    calculated_grade: { type: String, default: "" },
  },
  { _id: false, timestamps: true },
)

schema.index({ student_id: 1, term: 1 })

export const GradeDoc =
  (mongoose.models["Grade"] as mongoose.Model<IGrade>) ??
  mongoose.model<IGrade>("Grade", schema)
