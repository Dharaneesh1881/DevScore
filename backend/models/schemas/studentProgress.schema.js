import mongoose from 'mongoose';

export const studentProgressSchema = new mongoose.Schema({
  studentId:        { type: String, required: true },
  assignmentId:     { type: String, required: true },
  industryId:       { type: String, required: true },
  bestScore:        { type: Number, default: 0 },
  bestSubmissionId: { type: String, default: null },
  lastSubmissionId: { type: String, default: null },
  lastScore:        { type: Number, default: 0 },
  completed:        { type: Boolean, default: false },
  completedAt:      { type: Date, default: null },
  attempts:         { type: Number, default: 0 },
  updatedAt:        { type: Date, default: Date.now }
});

studentProgressSchema.index({ studentId: 1, assignmentId: 1 }, { unique: true });
