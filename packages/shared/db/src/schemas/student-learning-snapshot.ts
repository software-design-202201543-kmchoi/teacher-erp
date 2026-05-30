import mongoose, { Schema } from 'mongoose';

const subjectScoreSchema = new Schema(
  {
    subject_id: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    subject_name: { type: String, required: true },
    score: { type: Number, required: true },
    grade: { type: String, required: true },
  },
  { _id: false },
);

// Analytics-only collection. Written exclusively by the OLAP pipeline worker.
const studentLearningSnapshotSchema = new Schema(
  {
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    term: { type: String, required: true }, // e.g. "2024-1"
    avg_score: { type: Number },
    overall_grade: { type: String },
    subject_scores: { type: [subjectScoreSchema], default: [] },
    attendance_summary: { type: String },
    feedback_count: { type: Number, default: 0 },
    counseling_count: { type: Number, default: 0 },
    snapshot_at: { type: Date, required: true },
  },
  { timestamps: false },
);

studentLearningSnapshotSchema.index({ student_id: 1, term: 1 }, { unique: true });

export const StudentLearningSnapshotModel = mongoose.model(
  'StudentLearningSnapshot',
  studentLearningSnapshotSchema,
);
