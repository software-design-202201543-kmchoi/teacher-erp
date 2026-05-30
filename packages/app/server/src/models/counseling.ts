import mongoose, { Schema } from "mongoose"
import type { ICounselingRecord } from "@teacher-erp/shared-types"

const schema = new Schema<ICounselingRecord>(
  {
    _id: { type: String, required: true },
    student_id: { type: String, required: true },
    teacher_id: { type: String, required: true },
    counsel_date: { type: String, required: true },
    content: { type: String, required: true },
    next_plan: { type: String },
    is_shared: { type: Boolean, default: false },
  },
  { _id: false, timestamps: true },
)

schema.index({ student_id: 1, counsel_date: -1 })

export const CounselingDoc =
  (mongoose.models["CounselingRecord"] as mongoose.Model<ICounselingRecord>) ??
  mongoose.model<ICounselingRecord>("CounselingRecord", schema)
