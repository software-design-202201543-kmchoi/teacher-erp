import mongoose, { Schema } from 'mongoose';

const subjectSchema = new Schema({
  name: { type: String, required: true, unique: true },
}, { timestamps: true });

export const SubjectModel = mongoose.model('Subject', subjectSchema);
