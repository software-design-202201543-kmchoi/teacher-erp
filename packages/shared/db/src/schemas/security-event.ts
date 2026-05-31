import mongoose, { Schema } from 'mongoose';

export type SecurityEventType = 'auth_failure' | 'authz_denied' | 'suspicious_request';

const securityEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['auth_failure', 'authz_denied', 'suspicious_request'],
      required: true,
    },
    actor_id: { type: String, default: null },
    method: { type: String, required: true },
    path: { type: String, required: true },
    status: { type: Number, required: true },
    ip: { type: String, default: '' },
    user_agent: { type: String, default: '' },
    details: { type: Schema.Types.Mixed, default: null },
    occurred_at: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false },
);

securityEventSchema.index({ type: 1, occurred_at: -1 });
securityEventSchema.index({ actor_id: 1, occurred_at: -1 });
securityEventSchema.index({ path: 1, occurred_at: -1 });

export const SecurityEventModel = mongoose.model('SecurityEvent', securityEventSchema);

