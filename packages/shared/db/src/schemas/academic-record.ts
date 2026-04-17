import mongoose, { Schema } from 'mongoose';

const academicRecordSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  attendance_info: { type: String },
  special_notes: { type: String },
}, { timestamps: true });

export const AcademicRecordModel = mongoose.model('AcademicRecord', academicRecordSchema);
