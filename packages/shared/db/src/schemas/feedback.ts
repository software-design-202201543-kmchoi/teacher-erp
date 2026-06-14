/**
 * Feedback schema — single source of truth for the operational `feedbacks`
 * collection. String IDs for the same reason as Grade (see grade.ts): the auth,
 * JWT, client, and demo-data layers all key by string IDs, and an ObjectId model
 * here collided with the server's String model and crashed seeding.
 */
import mongoose, { Schema } from 'mongoose';
import type { IFeedback } from '@teacher-erp/shared-types';

const feedbackSchema = new Schema<IFeedback>(
  {
    _id: { type: String, required: true },
    student_id: { type: String, required: true },
    teacher_id: { type: String, required: true },
    type: {
      type: String,
      enum: ['성적', '행동', '출결', '태도'],
      required: true,
    },
    content: { type: String, required: true },
    visibility: {
      type: String,
      enum: ['PRIVATE', 'STUDENT', 'PARENT', 'ALL'],
      default: 'PRIVATE',
    },
  },
  { _id: false, timestamps: true },
);

feedbackSchema.index({ student_id: 1, createdAt: -1 });
feedbackSchema.index({ teacher_id: 1, createdAt: -1 });
feedbackSchema.index({ student_id: 1, visibility: 1 });

export const FeedbackModel = mongoose.model<IFeedback>('Feedback', feedbackSchema);
