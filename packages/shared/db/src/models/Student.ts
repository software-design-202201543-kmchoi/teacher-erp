import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  grade: number;
  classGroup: number;
  studentNumber: number;
  attendanceStats?: string;
  specialNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    grade: { type: Number, required: true },
    classGroup: { type: Number, required: true },
    studentNumber: { type: Number, required: true },
    attendanceStats: { type: String },
    specialNotes: { type: String },
  },
  { timestamps: true, collection: 'students' }
);

export const StudentModel: Model<IStudent> = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
