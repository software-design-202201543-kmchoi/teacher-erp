import mongoose, { Schema } from "mongoose"
import type { IFeedback } from "@teacher-erp/shared-types"

const schema = new Schema<IFeedback>(
  {
    _id: { type: String, required: true },
    student_id: { type: String, required: true },
    teacher_id: { type: String, required: true },
    type: { type: String, enum: ["성적", "행동", "출결", "태도"], required: true },
    content: { type: String, required: true },
    visibility: {
      type: String,
      enum: ["PRIVATE", "STUDENT", "PARENT", "ALL"],
      default: "PRIVATE",
    },
  },
  { _id: false, timestamps: true },
)

schema.index({ student_id: 1 })

export const FeedbackDoc =
  (mongoose.models["Feedback"] as mongoose.Model<IFeedback>) ??
  mongoose.model<IFeedback>("Feedback", schema)
