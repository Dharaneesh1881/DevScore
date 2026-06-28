import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole } from '../middleware/auth.js';
import IndustryAdmin from '../models/master/IndustryAdmin.js';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'dev_secret';

// All routes require industry_admin role
// req.db is populated by requireAuth since industry_admin carries an industrySlug JWT

// GET /api/industry-admin/teachers
router.get('/industry-admin/teachers', requireAuth, requireRole('industry_admin'), async (req, res) => {
  const teachers = await req.db.User.find({ role: 'teacher', industryId: req.user.industryId })
    .select('-passwordHash').sort({ name: 1 });
  return res.json(teachers);
});

// POST /api/industry-admin/teachers — create a teacher account
router.post('/industry-admin/teachers', requireAuth, requireRole('industry_admin'), async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  const { User } = req.db;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered in this industry' });

  const passwordHash = await User.hashPassword(password);
  const teacher = await User.create({
    name, email, passwordHash,
    role: 'teacher',
    industryId: req.user.industryId
  });
  return res.status(201).json({ id: teacher._id, name: teacher.name, email: teacher.email, role: teacher.role });
});

// PATCH /api/industry-admin/teachers/:id
router.patch('/industry-admin/teachers/:id', requireAuth, requireRole('industry_admin'), async (req, res) => {
  const { name, email, password } = req.body;
  const { User } = req.db;
  const teacher = await User.findOne({ _id: req.params.id, role: 'teacher', industryId: req.user.industryId });
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

  if (name)     teacher.name  = name.trim();
  if (email)    teacher.email = email.toLowerCase().trim();
  if (password) teacher.passwordHash = await User.hashPassword(password);
  await teacher.save();
  return res.json({ id: teacher._id, name: teacher.name, email: teacher.email, role: teacher.role });
});

// DELETE /api/industry-admin/teachers/:id — delete teacher and cascade
router.delete('/industry-admin/teachers/:id', requireAuth, requireRole('industry_admin'), async (req, res) => {
  const { User, Assignment, Submission, EvaluationRun, StudentProgress, Group } = req.db;
  const teacher = await User.findOne({ _id: req.params.id, role: 'teacher', industryId: req.user.industryId });
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

  // Find all assignments by this teacher
  const assignments = await Assignment.find({ createdBy: req.params.id }).select('_id');
  const assignmentIds = assignments.map(a => a._id.toString());

  // Find all submissions for those assignments
  const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } }).select('submissionId');
  const submissionIds = submissions.map(s => s.submissionId);

  await Promise.all([
    User.findByIdAndDelete(req.params.id),
    submissionIds.length > 0 ? EvaluationRun.deleteMany({ submissionId: { $in: submissionIds } }) : null,
    assignmentIds.length > 0 ? Submission.deleteMany({ assignmentId: { $in: assignmentIds } }) : null,
    assignmentIds.length > 0 ? StudentProgress.deleteMany({ assignmentId: { $in: assignmentIds } }) : null,
    Assignment.deleteMany({ createdBy: req.params.id }),
    Group.deleteMany({ teacherId: req.params.id })
  ]);

  return res.json({ success: true });
});

// GET /api/industry-admin/students — view all students in this industry
router.get('/industry-admin/students', requireAuth, requireRole('industry_admin'), async (req, res) => {
  const students = await req.db.User.find({ role: 'student', industryId: req.user.industryId })
    .select('-passwordHash').sort({ name: 1 });
  return res.json(students);
});

// GET /api/industry-admin/stats — overview stats
router.get('/industry-admin/stats', requireAuth, requireRole('industry_admin'), async (req, res) => {
  const { User, Assignment, Submission, StudentProgress } = req.db;
  const ind = req.user.industryId;

  const [teachers, students, assignments, progress] = await Promise.all([
    User.countDocuments({ role: 'teacher', industryId: ind }),
    User.countDocuments({ role: 'student', industryId: ind }),
    Assignment.countDocuments({ industryId: ind }),
    StudentProgress.find({ industryId: ind })
  ]);

  const completed = progress.filter(p => p.completed).length;
  const avgScore  = progress.length
    ? Math.round(progress.reduce((s, p) => s + p.bestScore, 0) / progress.length)
    : 0;

  return res.json({ teachers, students, assignments, completed, avgScore, totalProgress: progress.length });
});

export default router;
