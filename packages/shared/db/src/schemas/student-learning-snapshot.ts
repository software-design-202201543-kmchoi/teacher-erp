/**
 * StudentLearningSnapshot — analytics-only collection, written exclusively by the
 * OLAP pipeline worker. Single source of truth: the pipeline previously defined
 * this model inline, which collided with shared-db's ObjectId registration.
 *
 * String IDs to match the operational `grades`/`feedbacks` collections the
 * pipeline reads from (see grade.ts). The Schema is left untyped and the
 * StudentLearningSnapshot interface is applied at model level so the Date-typed
 * `snapshot_at` column (the pipeline writes `new Date()`) does not conflict with
 * the string-typed API contract.
 */
import mongoose, { Schema } from 'mongoose';
import type { StudentLearningSnapshot } from '@teacher-erp/shared-types';

const subjectScoreSchema = new Schema(
  {
    subject_id: { type: String, required: true },
    subject_name: { type: String, required: true },
    score: { type: Number, required: true },
    grade: { type: String, required: true },
  },
  { _id: false },
);

const studentLearningSnapshotSchema = new Schema(
  {
    student_id: { type: String, required: true },
    term: { type: String, required: true }, // e.g. "2024-1"
    avg_score: { type: Number, default: 0 },
    overall_grade: { type: String, default: '-' },
    subject_scores: { type: [subjectScoreSchema], default: [] },
    attendance_summary: { type: String, default: '-' },
    feedback_count: { type: Number, default: 0 },
    counseling_count: { type: Number, default: 0 },
    snapshot_at: { type: Date },
  },
  { timestamps: false },
);

studentLearningSnapshotSchema.index({ student_id: 1, term: 1 }, { unique: true });

export const StudentLearningSnapshotModel = mongoose.model<StudentLearningSnapshot>(
  'StudentLearningSnapshot',
  studentLearningSnapshotSchema,
);
