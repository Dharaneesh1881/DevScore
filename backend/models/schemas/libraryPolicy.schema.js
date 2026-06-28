import mongoose from 'mongoose';

export const libraryPolicySchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  version:    { type: String, required: true, trim: true },
  cdnUrls:    { type: [String], default: [] },
  industryId: { type: String, required: true },
  enabled:    { type: Boolean, default: true },
  createdAt:  { type: Date, default: Date.now }
});
