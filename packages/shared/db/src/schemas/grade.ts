/**
 * Grade schema — single source of truth for the operational `grades` collection.
 *
 * Why String IDs (not ObjectId):
 *   The whole system — auth accounts, JWT payloads, the client, and the demo
 *   data layer — keys records by string IDs ("student-1", "subject-국어",
 *   "grade-1"). Modelling these fields as ObjectId here caused a model-registry
 *   collision: shared-db registered an ObjectId "Grade" before the server's
 *   String model, so seeding string IDs threw a CastError and crashed startup.
 *   This package is now the only place "Grade" is defined, matching the
 *   string-ID contract used everywhere else (Change Streams ignore _id type).
 */
import mongoose, { Schema } from 'mongoose';
import type { IGrade } from '@teacher-erp/shared-types';

const gradeSchema = new Schema<IGrade>(
  {
    _id: { type: String, required: true },
    student_id: { type: String, required: true },
    subject_id: { type: String, required: true },
    teacher_id: { type: String, required: true },
    term: { type: String, required: true }, // e.g., "2024-1", "2024-2"
    score: { type: Number, required: true },
    calculated_grade: { type: String, default: '' }, // e.g., "A", "1등급"
  },
  { _id: false, timestamps: true },
);

// Non-unique read index. A unique {student,subject,teacher,term} constraint was
// considered but rejected: the demo seed re-inserts on every boot, so a unique
// violation would crash startup. Revisit if write-time dedup becomes a feature.
gradeSchema.index({ student_id: 1, term: 1 });

export const GradeModel = mongoose.model<IGrade>('Grade', gradeSchema);
