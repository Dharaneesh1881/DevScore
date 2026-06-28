import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { masterConnection } from '../../db/masterDb.js';

const industryAdminSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  industryId:   { type: String, required: true },
  industrySlug: { type: String, required: true },
  createdAt:    { type: Date, default: Date.now }
});

industryAdminSchema.statics.hashPassword = async (plain) => bcrypt.hash(plain, 10);
industryAdminSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default masterConnection.model('IndustryAdmin', industryAdminSchema);
