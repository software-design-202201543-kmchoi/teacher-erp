/**
 * SubjectProgressSummary — analytics-only collection, written exclusively by the
 * OLAP pipeline worker. Single source of truth: the pipeline previously defined
 * this model inline, which collided with shared-db's ObjectId registration.
 *
 * String IDs to match the operational collections the pipeline reads (see
 * grade.ts). Schema left untyped, interface applied at model level so the
 * Date-typed `last_updated_at` column does not conflict with the string-typed
 * API contract.
 */
import mongoose, { Schema } from 'mongoose';
import type { SubjectProgressSummary } from '@teacher-erp/shared-types';

const scoreHistoryEntrySchema = new Schema(
  {
    term: { type: String, required: true },
    score: { type: Number, required: true },
    grade: { type: String, required: true },
  },
  { _id: false },
);

const subjectProgressSummarySchema = new Schema(
  {
    student_id: { type: String, required: true },
    subject_id: { type: String, required: true },
    score_history: { type: [scoreHistoryEntrySchema], default: [] },
    avg_score: { type: Number, default: 0 },
    trend: { type: String, enum: ['UP', 'DOWN', 'STABLE'], default: 'STABLE' },
    last_updated_at: { type: Date },
  },
  { timestamps: false },
);

subjectProgressSummarySchema.index({ student_id: 1, subject_id: 1 }, { unique: true });

export const SubjectProgressSummaryModel = mongoose.model<SubjectProgressSummary>(
  'SubjectProgressSummary',
  subjectProgressSummarySchema,
);
