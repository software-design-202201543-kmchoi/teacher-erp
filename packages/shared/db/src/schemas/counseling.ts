import mongoose, { Schema } from 'mongoose';

const counselingRecordSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teacher_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  counsel_date: { type: Date, required: true },
  content: { type: String, required: true },
  next_plan: { type: String },
  is_shared: { type: Boolean, default: false },
}, { timestamps: true });

counselingRecordSchema.index({ student_id: 1, counsel_date: -1 });
counselingRecordSchema.index({ teacher_id: 1, counsel_date: -1 });
counselingRecordSchema.index({ student_id: 1, is_shared: 1 });

export const CounselingRecordModel = mongoose.model('CounselingRecord', counselingRecordSchema);
