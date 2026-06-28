import mongoose from 'mongoose';

export const groupSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  industryId: { type: String, required: true },
  teacherId:  { type: String, required: true },
  studentIds: { type: [String], default: [] },
  createdAt:  { type: Date, default: Date.now }
});
