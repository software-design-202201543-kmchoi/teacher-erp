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
  subjects_taught: [{ type: String }],
  homeroom: {
    grade_level: { type: Number },
    class_num: { type: Number }
  }
}));

export const StudentModel = UserModel.discriminator('STUDENT', new Schema({
  grade_level: { type: Number, required: true },
  class_num: { type: Number, required: true },
  student_num: { type: Number, required: true }
}));

export const ParentModel = UserModel.discriminator('PARENT', new Schema({
  phone_number: { type: String },
  children: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}));
