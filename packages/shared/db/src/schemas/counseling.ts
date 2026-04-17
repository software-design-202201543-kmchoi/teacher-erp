import mongoose, { Schema } from 'mongoose';

const counselingRecordSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teacher_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  counsel_date: { type: Date, required: true },
  content: { type: String, required: true },
  next_plan: { type: String },
  is_shared: { type: Boolean, default: false },
}, { timestamps: true });

export const CounselingRecordModel = mongoose.model('CounselingRecord', counselingRecordSchema);
