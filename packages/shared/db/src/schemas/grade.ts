import mongoose, { Schema } from 'mongoose';

const gradeSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject_id: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacher_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  term: { type: String, required: true }, // e.g., "2024-1", "2024-2"
  score: { type: Number, required: true },
  calculated_grade: { type: String }, // e.g., "A", "1등급"
}, { timestamps: true });

gradeSchema.index({ student_id: 1, subject_id: 1, teacher_id: 1, term: 1 }, { unique: true });

export const GradeModel = mongoose.model('Grade', gradeSchema);
