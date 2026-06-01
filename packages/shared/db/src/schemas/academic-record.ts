import mongoose, { Schema } from 'mongoose';

const academicRecordSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  attendance_info: { type: String },
  special_notes: { type: String },
  // 커스텀 항목 값: { [field_id]: value } — FieldDefinition 참조
  custom_fields: { type: Map, of: String, default: () => new Map() },
}, { timestamps: true });

export const AcademicRecordModel = mongoose.model('AcademicRecord', academicRecordSchema);
