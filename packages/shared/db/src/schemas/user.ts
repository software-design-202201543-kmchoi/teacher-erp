import mongoose, { Schema } from 'mongoose';

const baseUserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
}, { 
  discriminatorKey: 'role', 
  timestamps: true 
});

export const UserModel = mongoose.model('User', baseUserSchema);

export const TeacherModel = UserModel.discriminator('TEACHER', new Schema({
  subjectsTaught: [{ type: String }],
  homeroom: {
    grade: { type: Number },
    classId: { type: Number }
  }
}));

export const StudentModel = UserModel.discriminator('STUDENT', new Schema({
  grade: { type: Number, required: true },
  classId: { type: Number, required: true },
  studentNumber: { type: Number, required: true }
}));

export const ParentModel = UserModel.discriminator('PARENT', new Schema({
  children: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}));
