import mongoose, { Schema } from 'mongoose';

const teacherSubjectSchema = new Schema({
  teacher_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject_id: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
}, { timestamps: true });

teacherSubjectSchema.index({ teacher_id: 1, subject_id: 1 }, { unique: true });

export const TeacherSubjectModel = mongoose.model('TeacherSubject', teacherSubjectSchema);
