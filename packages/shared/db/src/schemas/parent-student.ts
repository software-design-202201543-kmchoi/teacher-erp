import mongoose, { Schema } from 'mongoose';

const parentStudentSchema = new Schema({
  parent_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  relation: { type: String }, // e.g., "아버지", "어머니", "법정대리인"
}, { timestamps: true });

parentStudentSchema.index({ parent_id: 1, student_id: 1 }, { unique: true });

export const ParentStudentModel = mongoose.model('ParentStudent', parentStudentSchema);
