import mongoose, { Schema } from 'mongoose';

export type AuditOperation = 'create' | 'update' | 'delete';
export type AuditCollection = 'grades' | 'feedbacks' | 'counselingrecords';

const auditLogSchema = new Schema(
  {
    collection: {
      type: String,
      enum: ['grades', 'feedbacks', 'counselingrecords'],
      required: true,
    },
    doc_id: { type: String, required: true },
    student_id: { type: String, required: true },
    operation: { type: String, enum: ['create', 'update', 'delete'], required: true },
    actor_id: { type: String, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    occurred_at: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false },
);

auditLogSchema.index({ student_id: 1, occurred_at: -1 });
auditLogSchema.index({ actor_id: 1, occurred_at: -1 });
auditLogSchema.index({ doc_id: 1, occurred_at: -1 });

export const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);
