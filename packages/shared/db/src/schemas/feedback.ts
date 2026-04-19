import mongoose, { Schema } from 'mongoose';

const feedbackSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teacher_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['성적', '행동', '출결', '태도'], 
    required: true 
  },
  content: { type: String, required: true },
  visibility: { 
    type: String, 
    enum: ['PRIVATE', 'STUDENT', 'PARENT', 'ALL'], 
    default: 'PRIVATE' 
  },
}, { timestamps: true });

export const FeedbackModel = mongoose.model('Feedback', feedbackSchema);
