import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['teacher', 'student'], required: true },
  industryId:   { type: String, required: true },
  createdAt:    { type: Date, default: Date.now }
});

userSchema.statics.hashPassword = async (plain) => bcrypt.hash(plain, 10);
userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};
