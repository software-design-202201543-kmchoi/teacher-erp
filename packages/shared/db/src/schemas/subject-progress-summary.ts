import mongoose, { Schema } from 'mongoose';

const scoreHistoryEntrySchema = new Schema(
  {
    term: { type: String, required: true },
    score: { type: Number, required: true },
    grade: { type: String, required: true },
  },
  { _id: false },
);

// Analytics-only collection. Written exclusively by the OLAP pipeline worker.
const subjectProgressSummarySchema = new Schema(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject_id: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    score_history: { type: [scoreHistoryEntrySchema], default: [] },
    avg_score: { type: Number },
    trend: { type: String, enum: ['UP', 'DOWN', 'STABLE'], default: 'STABLE' },
    last_updated_at: { type: Date, required: true },
  },
  { timestamps: false },
);

subjectProgressSummarySchema.index({ student_id: 1, subject_id: 1 }, { unique: true });

export const SubjectProgressSummaryModel = mongoose.model(
  'SubjectProgressSummary',
  subjectProgressSummarySchema,
);
