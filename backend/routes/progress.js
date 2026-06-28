import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { normalizeStoredFiles } from '../utils/projectFiles.js';

const router = Router();

// GET /api/progress — student's own progress
router.get('/progress', requireAuth, async (req, res) => {
  const records = await req.db.StudentProgress.find({ studentId: req.user.id, industryId: req.user.industryId });
  const progressMap = Object.fromEntries(
    records.map(r => [r.assignmentId, {
      bestScore: r.bestScore, completed: r.completed,
      completedAt: r.completedAt, attempts: r.attempts
    }])
  );
  return res.json(progressMap);
});

// GET /api/progress/:assignmentId
router.get('/progress/:assignmentId', requireAuth, async (req, res) => {
  const record = await req.db.StudentProgress.findOne({
    studentId: req.user.id, assignmentId: req.params.assignmentId
  });
  if (!record) return res.json({ bestScore: 0, completed: false, attempts: 0, completedAt: null });
  return res.json({ bestScore: record.bestScore, completed: record.completed, completedAt: record.completedAt, attempts: record.attempts });
});

// GET /api/progress/:assignmentId/code
router.get('/progress/:assignmentId/code', requireAuth, async (req, res) => {
  const { StudentProgress, Submission } = req.db;
  const record = await StudentProgress.findOne({ studentId: req.user.id, assignmentId: req.params.assignmentId });
  if (!record?.lastSubmissionId) return res.json({ files: [] });
  const submission = await Submission.findOne({ submissionId: record.lastSubmissionId });
  if (!submission) return res.json({ files: [] });
  return res.json({ files: normalizeStoredFiles(submission.files) });
});

// ── Leaderboard (teacher-only) ──────────────────────────────────────────────

// GET /api/leaderboard
router.get('/leaderboard', requireAuth, requireRole('teacher'), async (req, res) => {
  const { Assignment, StudentProgress, User } = req.db;
  const assignments = await Assignment.find({ isActive: true, industryId: req.user.industryId })
    .select('_id title description referenceScreenshotUrl referencePageScreenshots')
    .sort({ createdAt: -1 });

  const allProgress = await StudentProgress.find({ industryId: req.user.industryId });
  const studentIds  = [...new Set(allProgress.map(p => p.studentId))];
  const users       = await User.find({ _id: { $in: studentIds } }).select('_id name email');
  const userMap     = Object.fromEntries(users.map(u => [u._id.toString(), { name: u.name, email: u.email }]));

  const progressByAssignment = {};
  for (const p of allProgress) {
    (progressByAssignment[p.assignmentId] ??= []).push(p);
  }

  const leaderboard = assignments.map(a => {
    const records = progressByAssignment[a._id.toString()] || [];
    const ranked  = records
      .map(p => ({
        studentId: p.studentId,
        name:      userMap[p.studentId]?.name  || 'Unknown',
        email:     userMap[p.studentId]?.email || '',
        bestScore: p.bestScore, completed: p.completed,
        completedAt: p.completedAt, attempts: p.attempts
      }))
      .sort((a, b) => b.completed !== a.completed ? (b.completed ? 1 : -1) : b.bestScore - a.bestScore)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return {
      assignmentId: a._id, title: a.title, description: a.description,
      referenceScreenshotUrl:   a.referenceScreenshotUrl,
      referencePageScreenshots: a.referencePageScreenshots || [],
      totalStudents:  ranked.length,
      completedCount: ranked.filter(s => s.completed).length,
      avgScore:       ranked.length ? Math.round(ranked.reduce((s, x) => s + x.bestScore, 0) / ranked.length) : 0,
      students: ranked
    };
  });
  return res.json(leaderboard);
});

// GET /api/leaderboard/:assignmentId
router.get('/leaderboard/:assignmentId', requireAuth, requireRole('teacher'), async (req, res) => {
  const { Assignment, StudentProgress, User } = req.db;
  const assignment = await Assignment.findById(req.params.assignmentId).select('_id title description');
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const records    = await StudentProgress.find({ assignmentId: req.params.assignmentId });
  const studentIds = records.map(p => p.studentId);
  const users      = await User.find({ _id: { $in: studentIds } }).select('_id name email');
  const userMap    = Object.fromEntries(users.map(u => [u._id.toString(), { name: u.name, email: u.email }]));

  const ranked = records
    .map(p => ({ studentId: p.studentId, name: userMap[p.studentId]?.name || 'Unknown', email: userMap[p.studentId]?.email || '', bestScore: p.bestScore, completed: p.completed, completedAt: p.completedAt, attempts: p.attempts }))
    .sort((a, b) => b.completed !== a.completed ? (b.completed ? 1 : -1) : b.bestScore - a.bestScore)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return res.json({ assignment, students: ranked });
});

// GET /api/student-leaderboard
router.get('/student-leaderboard', requireAuth, async (req, res) => {
  const { Assignment, StudentProgress, User } = req.db;
  const myId = req.user.id;

  const assignments = await Assignment.find({ isActive: true, industryId: req.user.industryId })
    .select('_id title').sort({ createdAt: -1 });

  const allProgress = await StudentProgress.find({ assignmentId: { $in: assignments.map(a => a._id.toString()) } });
  const studentIds  = [...new Set(allProgress.map(p => p.studentId))];
  const users       = await User.find({ _id: { $in: studentIds } }).select('_id name');
  const userMap     = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));

  const progressByAssignment = {};
  for (const p of allProgress) {
    (progressByAssignment[p.assignmentId] ??= []).push(p);
  }

  const result = assignments.map(a => {
    const records = progressByAssignment[a._id.toString()] || [];
    const ranked  = records
      .map(p => ({ studentId: p.studentId, name: userMap[p.studentId] || 'Student', bestScore: p.bestScore, completed: p.completed, attempts: p.attempts }))
      .sort((a, b) => b.completed !== a.completed ? (b.completed ? 1 : -1) : b.bestScore - a.bestScore)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    const top3 = ranked.slice(0, 3);
    const me   = ranked.find(s => s.studentId === myId) || null;
    return {
      assignmentId: a._id, title: a.title, totalStudents: ranked.length,
      top3, myRank: me ? { rank: me.rank, bestScore: me.bestScore, completed: me.completed } : null
    };
  });
  return res.json(result);
});

// GET /api/teacher/student-submission/:assignmentId/:studentId
router.get('/teacher/student-submission/:assignmentId/:studentId', requireAuth, requireRole('teacher'), async (req, res) => {
  const { StudentProgress, Submission, EvaluationRun, User } = req.db;
  const { assignmentId, studentId } = req.params;

  const progress = await StudentProgress.findOne({ assignmentId, studentId });
  if (!progress?.lastSubmissionId) return res.status(404).json({ error: 'No submission found for this student.' });

  const [submission, evalRun, user] = await Promise.all([
    Submission.findOne({ submissionId: progress.lastSubmissionId }),
    EvaluationRun.findOne({ submissionId: progress.lastSubmissionId }),
    User.findById(studentId).select('name email')
  ]);

  if (!submission) return res.status(404).json({ error: 'Submission data not found.' });

  return res.json({
    student:   user ? { name: user.name, email: user.email } : null,
    files:     normalizeStoredFiles(submission.files),
    result:    evalRun || null,
    bestScore: progress.bestScore,
    completed: progress.completed,
    attempts:  progress.attempts
  });
});

// ── Teacher: Library Policies ─────────────────────────────────────────────────

router.get('/teacher/library-policies', requireAuth, requireRole('teacher'), async (req, res) => {
  const policies = await req.db.LibraryPolicy.find({ industryId: req.user.industryId }).sort({ name: 1, version: 1 });
  return res.json(policies);
});

router.post('/teacher/library-policies', requireAuth, requireRole('teacher'), async (req, res) => {
  const { name, version, cdnUrls } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (!version?.trim()) return res.status(400).json({ error: 'version is required' });
  const urls   = Array.isArray(cdnUrls) ? cdnUrls.map(u => u.trim()).filter(Boolean) : [];
  const policy = await req.db.LibraryPolicy.create({ name: name.trim(), version: version.trim(), cdnUrls: urls, industryId: req.user.industryId });
  return res.status(201).json(policy);
});

router.patch('/teacher/library-policies/:id', requireAuth, requireRole('teacher'), async (req, res) => {
  const { name, version, cdnUrls, enabled } = req.body;
  const update = {};
  if (name !== undefined)           update.name    = name.trim();
  if (version !== undefined)        update.version = version.trim();
  if (Array.isArray(cdnUrls))       update.cdnUrls = cdnUrls.map(u => u.trim()).filter(Boolean);
  if (enabled !== undefined)        update.enabled = Boolean(enabled);
  const policy = await req.db.LibraryPolicy.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!policy) return res.status(404).json({ error: 'Not found' });
  return res.json(policy);
});

router.delete('/teacher/library-policies/:id', requireAuth, requireRole('teacher'), async (req, res) => {
  const { LibraryPolicy, Assignment } = req.db;
  await LibraryPolicy.findByIdAndDelete(req.params.id);
  await Assignment.updateMany({ allowedLibraryPolicyIds: req.params.id }, { $pull: { allowedLibraryPolicyIds: req.params.id } });
  return res.json({ success: true });
});

// ── Teacher: Progress Records ─────────────────────────────────────────────────

router.get('/teacher/progress', requireAuth, requireRole('teacher'), async (req, res) => {
  const { StudentProgress, User } = req.db;
  const { assignmentId } = req.query;
  const filter = { industryId: req.user.industryId };
  if (assignmentId) filter.assignmentId = assignmentId;

  const records  = await StudentProgress.find(filter).sort({ bestScore: -1 });
  const userIds  = records.map(r => r.studentId);
  const users    = await User.find({ _id: { $in: userIds } }).select('name email');
  const userMap  = Object.fromEntries(users.map(u => [u._id.toString(), u]));
  const result   = records.map(r => ({ ...r.toObject(), studentName: userMap[r.studentId]?.name || 'Unknown', studentEmail: userMap[r.studentId]?.email || '' }));
  return res.json(result);
});

router.delete('/teacher/progress/:id', requireAuth, requireRole('teacher'), async (req, res) => {
  await req.db.StudentProgress.findByIdAndDelete(req.params.id);
  return res.json({ success: true });
});

// ── Teacher: Global Submissions ───────────────────────────────────────────────

router.get('/teacher/submissions', requireAuth, requireRole('teacher'), async (req, res) => {
  const { StudentProgress, Submission, EvaluationRun, User } = req.db;
  const { limit = 100, skip = 0 } = req.query;

  const progressRecords = await StudentProgress.find({ industryId: req.user.industryId })
    .select('studentId assignmentId bestSubmissionId bestScore completed attempts updatedAt')
    .sort({ updatedAt: -1 });

  const bestSubmissionIds = progressRecords.map(r => r.bestSubmissionId).filter(Boolean);
  const bestSubmissions   = await Submission.find({ submissionId: { $in: bestSubmissionIds } });
  const submissionById    = new Map(bestSubmissions.map(s => [s.submissionId, s]));

  const ordered = progressRecords
    .filter(r => r.bestSubmissionId)
    .map(r => {
      const sub = submissionById.get(r.bestSubmissionId);
      return { submissionId: r.bestSubmissionId, assignmentId: r.assignmentId, studentId: r.studentId, status: sub?.status || 'missing', submittedAt: sub?.submittedAt || r.updatedAt, bestScore: r.bestScore, completed: r.completed, attempts: r.attempts };
    })
    .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

  const paged   = ordered.slice(Number(skip), Number(skip) + Number(limit));
  const userIds = [...new Set(paged.map(s => s.studentId).filter(Boolean))];
  const users   = await User.find({ _id: { $in: userIds } }).select('name email');
  const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

  const evalRuns = await EvaluationRun.find({ submissionId: { $in: paged.map(s => s.submissionId) } });
  const runMap   = Object.fromEntries(evalRuns.map(r => [r.submissionId, r]));

  const result = paged.map(s => ({ ...s, evalRun: runMap[s.submissionId] || null, studentName: userMap[s.studentId]?.name || 'Unknown', studentEmail: userMap[s.studentId]?.email || '' }));
  return res.json({ submissions: result, total: ordered.length });
});

// ── Teacher: Students ──────────────────────────────────────────────────────────

// GET /api/teacher/students — teacher views students in their industry
router.get('/teacher/students', requireAuth, requireRole('teacher'), async (req, res) => {
  const students = await req.db.User.find({ role: 'student', industryId: req.user.industryId })
    .select('-passwordHash').sort({ name: 1 });
  return res.json(students);
});

// POST /api/teacher/students — teacher creates a student account
router.post('/teacher/students', requireAuth, requireRole('teacher'), async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password are required' });

  const { User } = req.db;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await User.hashPassword(password);
  const student      = await User.create({ name, email, passwordHash, role: 'student', industryId: req.user.industryId });
  return res.status(201).json({ id: student._id, name: student.name, email: student.email, role: student.role });
});

// DELETE /api/teacher/students/:id — teacher deletes a student and cascade
router.delete('/teacher/students/:id', requireAuth, requireRole('teacher'), async (req, res) => {
  const { User, Submission, EvaluationRun, StudentProgress } = req.db;
  const student = await User.findOne({ _id: req.params.id, role: 'student', industryId: req.user.industryId });
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const submissions  = await Submission.find({ studentId: req.params.id }).select('submissionId');
  const submissionIds = submissions.map(s => s.submissionId);

  await Promise.all([
    User.findByIdAndDelete(req.params.id),
    submissionIds.length > 0 ? EvaluationRun.deleteMany({ submissionId: { $in: submissionIds } }) : null,
    Submission.deleteMany({ studentId: req.params.id }),
    StudentProgress.deleteMany({ studentId: req.params.id })
  ]);

  return res.json({ success: true });
});

export default router;
