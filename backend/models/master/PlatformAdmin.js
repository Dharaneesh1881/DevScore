import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { masterConnection } from '../../db/masterDb.js';

const platformAdminSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt:    { type: Date, default: Date.now }
});

platformAdminSchema.statics.hashPassword = async (plain) => bcrypt.hash(plain, 10);
platformAdminSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default masterConnection.model('PlatformAdmin', platformAdminSchema);
