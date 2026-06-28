import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Industry from '../models/master/Industry.js';
import { requireAuth } from '../middleware/auth.js';
import { getTenantConnection, getTenantModels } from '../db/connections.js';
import { platformAdminLogin, industryAdminLogin } from '../middleware/adminAuth.js';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'dev_secret';

function signUserToken(user, industry) {
  return jwt.sign(
    {
      id:           user._id.toString(),
      email:        user.email,
      role:         user.role,
      industryId:   industry._id.toString(),
      industrySlug: industry.slug
    },
    SECRET,
    { expiresIn: '7d' }
  );
}

// GET /api/industries — public: list active industries for the landing page
router.get('/industries', async (req, res) => {
  const industries = await Industry.find({ isActive: true })
    .select('_id name slug')
    .sort({ name: 1 });
  return res.json(industries);
});

// POST /api/auth/platform-admin/login
router.post('/platform-admin/login', platformAdminLogin);

// POST /api/auth/industry-admin/login
router.post('/industry-admin/login', industryAdminLogin);

// POST /api/auth/register — teacher or student inside an industry (created by teacher/industry_admin)
router.post('/register', async (req, res) => {
  const { name, email, password, role, industrySlug } = req.body;
  if (!name || !email || !password || !role || !industrySlug) {
    return res.status(400).json({ error: 'name, email, password, role, and industrySlug are required' });
  }
  if (!['teacher', 'student'].includes(role)) {
    return res.status(400).json({ error: 'role must be "teacher" or "student"' });
  }

  const industry = await Industry.findOne({ slug: industrySlug, isActive: true });
  if (!industry) return res.status(404).json({ error: 'Industry not found' });

  const conn = await getTenantConnection(industrySlug);
  const { User } = getTenantModels(conn);

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered in this industry' });

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash, role, industryId: industry._id.toString() });
  const token = signUserToken(user, industry);

  return res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, industrySlug }
  });
});

// POST /api/auth/login — teacher or student login
router.post('/login', async (req, res) => {
  const { email, password, industrySlug } = req.body;
  if (!email || !password || !industrySlug) {
    return res.status(400).json({ error: 'email, password, and industrySlug are required' });
  }

  const industry = await Industry.findOne({ slug: industrySlug, isActive: true });
  if (!industry) return res.status(404).json({ error: 'Industry not found' });

  const conn = await getTenantConnection(industrySlug);
  const { User } = getTenantModels(conn);

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await user.verifyPassword(password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signUserToken(user, industry);
  return res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, industrySlug }
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { role, industrySlug } = req.user;

  // Platform admin — no tenant DB
  if (role === 'platform_admin') {
    return res.json({ id: req.user.id, email: req.user.email, role, name: 'Platform Admin' });
  }

  // Industry admin — stored in master DB, not tenant User collection
  if (role === 'industry_admin') {
    return res.json({
      id:           req.user.id,
      email:        req.user.email,
      role,
      name:         req.user.name,
      industryId:   req.user.industryId,
      industrySlug: req.user.industrySlug
    });
  }

  const user = await req.db.User.findById(req.user.id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ id: user._id, name: user.name, email: user.email, role: user.role, industrySlug });
});

export default router;
