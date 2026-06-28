import { Router } from 'express';
import { requirePlatformAdmin, platformAdminLogin } from '../middleware/adminAuth.js';
import Industry from '../models/master/Industry.js';
import IndustryAdmin from '../models/master/IndustryAdmin.js';
import { getTenantConnection, getTenantModels } from '../db/connections.js';

const router = Router();

// POST /api/platform-admin/login
router.post('/platform-admin/login', platformAdminLogin);

// ── Industries ────────────────────────────────────────────────────────────────

// GET /api/platform-admin/industries
router.get('/platform-admin/industries', requirePlatformAdmin, async (req, res) => {
  const industries = await Industry.find({}).sort({ name: 1 });

  // Attach per-industry stats by connecting to each tenant DB
  const results = await Promise.all(industries.map(async (ind) => {
    try {
      const conn   = await getTenantConnection(ind.slug);
      const { User, Assignment, StudentProgress } = getTenantModels(conn);
      const [teachers, students, assignments, progress] = await Promise.all([
        User.countDocuments({ role: 'teacher' }),
        User.countDocuments({ role: 'student' }),
        Assignment.countDocuments(),
        StudentProgress.countDocuments()
      ]);
      return { ...ind.toObject(), stats: { teachers, students, assignments, progress } };
    } catch {
      return { ...ind.toObject(), stats: { teachers: 0, students: 0, assignments: 0, progress: 0 } };
    }
  }));

  return res.json(results);
});

// POST /api/platform-admin/industries
router.post('/platform-admin/industries', requirePlatformAdmin, async (req, res) => {
  const { name, slug } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (!slug?.trim())  return res.status(400).json({ error: 'slug is required' });

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const existing  = await Industry.findOne({ slug: cleanSlug });
  if (existing)   return res.status(409).json({ error: 'Industry slug already exists' });

  const industry = await Industry.create({ name: name.trim(), slug: cleanSlug });
  return res.status(201).json(industry);
});

// PATCH /api/platform-admin/industries/:id
router.patch('/platform-admin/industries/:id', requirePlatformAdmin, async (req, res) => {
  const { name, isActive } = req.body;
  const update = {};
  if (name !== undefined)     update.name     = name.trim();
  if (isActive !== undefined) update.isActive = Boolean(isActive);

  const industry = await Industry.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!industry) return res.status(404).json({ error: 'Industry not found' });
  return res.json(industry);
});

// DELETE /api/platform-admin/industries/:id — deletes tenant DB + Cloudinary folder
router.delete('/platform-admin/industries/:id', requirePlatformAdmin, async (req, res) => {
  const industry = await Industry.findById(req.params.id);
  if (!industry) return res.status(404).json({ error: 'Industry not found' });

  // Drop the tenant database
  try {
    const conn = await getTenantConnection(industry.slug);
    await conn.dropDatabase();
  } catch (err) {
    console.warn(`Could not drop tenant DB for ${industry.slug}:`, err.message);
  }

  // Delete Cloudinary folder (best-effort)
  try {
    const { v2: cloudinary } = await import('cloudinary');
    await cloudinary.api.delete_resources_by_prefix(`industries/${industry.slug}/`);
    await cloudinary.api.delete_folder(`industries/${industry.slug}`);
  } catch (err) {
    console.warn(`Cloudinary cleanup failed for ${industry.slug}:`, err.message);
  }

  await IndustryAdmin.deleteMany({ industryId: req.params.id });
  await Industry.findByIdAndDelete(req.params.id);

  return res.json({ success: true });
});

// ── Industry Admins ───────────────────────────────────────────────────────────

// GET /api/platform-admin/industry-admins
router.get('/platform-admin/industry-admins', requirePlatformAdmin, async (req, res) => {
  const admins = await IndustryAdmin.find({}).select('-passwordHash').sort({ createdAt: -1 });
  return res.json(admins);
});

// POST /api/platform-admin/industry-admins
router.post('/platform-admin/industry-admins', requirePlatformAdmin, async (req, res) => {
  const { name, email, password, industryId } = req.body;
  if (!name || !email || !password || !industryId) {
    return res.status(400).json({ error: 'name, email, password, and industryId are required' });
  }

  const industry = await Industry.findById(industryId);
  if (!industry) return res.status(404).json({ error: 'Industry not found' });

  const existing = await IndustryAdmin.findOne({ email: email.toLowerCase().trim() });
  if (existing)  return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await IndustryAdmin.hashPassword(password);
  const admin = await IndustryAdmin.create({
    name, email, passwordHash,
    industryId:   industry._id.toString(),
    industrySlug: industry.slug
  });

  return res.status(201).json({ id: admin._id, name: admin.name, email: admin.email, industryId: admin.industryId, industrySlug: admin.industrySlug });
});

// PATCH /api/platform-admin/industry-admins/:id
router.patch('/platform-admin/industry-admins/:id', requirePlatformAdmin, async (req, res) => {
  const { name, email, password } = req.body;
  const admin = await IndustryAdmin.findById(req.params.id);
  if (!admin) return res.status(404).json({ error: 'Industry admin not found' });

  if (name)     admin.name  = name.trim();
  if (email)    admin.email = email.toLowerCase().trim();
  if (password) admin.passwordHash = await IndustryAdmin.hashPassword(password);
  await admin.save();
  return res.json({ id: admin._id, name: admin.name, email: admin.email });
});

// DELETE /api/platform-admin/industry-admins/:id
router.delete('/platform-admin/industry-admins/:id', requirePlatformAdmin, async (req, res) => {
  await IndustryAdmin.findByIdAndDelete(req.params.id);
  return res.json({ success: true });
});

// ── Cross-industry Comparison Dashboard ──────────────────────────────────────

// GET /api/platform-admin/stats
router.get('/platform-admin/stats', requirePlatformAdmin, async (req, res) => {
  const industries = await Industry.find({});
  const totalIndustries = industries.length;

  const perIndustry = await Promise.all(industries.map(async (ind) => {
    try {
      const conn = await getTenantConnection(ind.slug);
      const { User, Assignment, StudentProgress } = getTenantModels(conn);
      const [teachers, students, assignments, progress] = await Promise.all([
        User.countDocuments({ role: 'teacher' }),
        User.countDocuments({ role: 'student' }),
        Assignment.countDocuments(),
        StudentProgress.find({})
      ]);
      const completed = progress.filter(p => p.completed).length;
      const avgScore  = progress.length
        ? Math.round(progress.reduce((s, p) => s + p.bestScore, 0) / progress.length)
        : 0;
      return { industryId: ind._id, name: ind.name, slug: ind.slug, teachers, students, assignments, totalProgress: progress.length, completed, avgScore };
    } catch {
      return { industryId: ind._id, name: ind.name, slug: ind.slug, teachers: 0, students: 0, assignments: 0, totalProgress: 0, completed: 0, avgScore: 0 };
    }
  }));

  const totals = perIndustry.reduce((acc, i) => ({
    teachers:      acc.teachers      + i.teachers,
    students:      acc.students      + i.students,
    assignments:   acc.assignments   + i.assignments,
    totalProgress: acc.totalProgress + i.totalProgress,
    completed:     acc.completed     + i.completed
  }), { teachers: 0, students: 0, assignments: 0, totalProgress: 0, completed: 0 });

  return res.json({ totalIndustries, totals, perIndustry });
});

export default router;
