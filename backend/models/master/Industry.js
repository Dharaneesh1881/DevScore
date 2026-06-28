import mongoose from 'mongoose';
import { masterConnection } from '../../db/masterDb.js';

const industrySchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  slug:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  isActive:  { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default masterConnection.model('Industry', industrySchema);
