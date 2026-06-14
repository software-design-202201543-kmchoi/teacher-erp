/**
 * Counseling record schema — single source of truth for the operational
 * `counselingrecords` collection. String IDs for the same reason as Grade
 * (see grade.ts).
 *
 * `counsel_date` is a String (e.g. "2024-03-15"), not a Date: the demo data and
 * the OLAP pipeline both treat it as a string (the pipeline filters by year with
 * a `^${year}` regex), and the client/API contract (ICounselingRecord) types it
 * as string. Storing it as Date would break that prefix-match query.
 */
import mongoose, { Schema } from 'mongoose';
import type { ICounselingRecord } from '@teacher-erp/shared-types';

const counselingRecordSchema = new Schema<ICounselingRecord>(
  {
    _id: { type: String, required: true },
    student_id: { type: String, required: true },
    teacher_id: { type: String, required: true },
    counsel_date: { type: String, required: true }, // e.g. "2024-03-15"
    content: { type: String, required: true },
    next_plan: { type: String },
    is_shared: { type: Boolean, default: false },
  },
  { _id: false, timestamps: true },
);

counselingRecordSchema.index({ student_id: 1, counsel_date: -1 });
counselingRecordSchema.index({ teacher_id: 1, counsel_date: -1 });
counselingRecordSchema.index({ student_id: 1, is_shared: 1 });

export const CounselingRecordModel = mongoose.model<ICounselingRecord>(
  'CounselingRecord',
  counselingRecordSchema,
);
