import jwt from 'jsonwebtoken';
import PlatformAdmin from '../models/master/PlatformAdmin.js';
import IndustryAdmin from '../models/master/IndustryAdmin.js';

const SECRET = process.env.JWT_SECRET || 'dev_secret';

export async function platformAdminLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const admin = await PlatformAdmin.findOne({ email: email.toLowerCase().trim() });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await admin.verifyPassword(password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: admin._id.toString(), email: admin.email, role: 'platform_admin', name: admin.name },
    SECRET,
    { expiresIn: '12h' }
  );
  return res.json({ token, user: { id: admin._id, name: admin.name, email: admin.email, role: 'platform_admin' } });
}

export async function industryAdminLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const admin = await IndustryAdmin.findOne({ email: email.toLowerCase().trim() });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await admin.verifyPassword(password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: admin._id.toString(), email: admin.email, role: 'industry_admin',
      industryId: admin.industryId, industrySlug: admin.industrySlug, name: admin.name },
    SECRET,
    { expiresIn: '12h' }
  );
  return res.json({
    token,
    user: {
      id: admin._id, name: admin.name, email: admin.email,
      role: 'industry_admin', industryId: admin.industryId, industrySlug: admin.industrySlug
    }
  });
}

export function requirePlatformAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Platform admin auth required' });
  }
  try {
    const payload = jwt.verify(header.slice(7), SECRET);
    if (payload.role !== 'platform_admin') {
      return res.status(403).json({ error: 'Platform admin access only' });
    }
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Legacy alias used by old admin.js routes (still in use)
export const adminLogin = platformAdminLogin;
export const requireAdmin = requirePlatformAdmin;
