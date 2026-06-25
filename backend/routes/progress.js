import { Router } from 'express';
import StudentProgress from '../models/StudentProgress.js';
import Submission from '../models/Submission.js';
import EvaluationRun from '../models/EvaluationRun.js';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import LibraryPolicy from '../models/LibraryPolicy.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { normalizeStoredFiles } from '../utils/projectFiles.js';

const router = Router();

// GET /api/progress — current student's progress across all assignments
router.get('/progress', requireAuth, async (req, res) => {
    const records = await StudentProgress.find({ studentId: req.user.id });
    const progressMap = Object.fromEntries(
        records.map(r => [r.assignmentId, {
            bestScore: r.bestScore,
            completed: r.completed,
            completedAt: r.completedAt,
            attempts: r.attempts
        }])
    );
    return res.json(progressMap);
});

// GET /api/progress/:assignmentId — one assignment's progress for current student
router.get('/progress/:assignmentId', requireAuth, async (req, res) => {
    const record = await StudentProgress.findOne({
        studentId: req.user.id,
        assignmentId: req.params.assignmentId
    });
    if (!record) return res.json({ bestScore: 0, completed: false, attempts: 0, completedAt: null });
    return res.json({
        bestScore: record.bestScore,
        completed: record.completed,
        completedAt: record.completedAt,
        attempts: record.attempts
    });
});

// GET /api/progress/:assignmentId/code — return the student's last submission code
router.get('/progress/:assignmentId/code', requireAuth, async (req, res) => {
    const record = await StudentProgress.findOne({
        studentId: req.user.id,
        assignmentId: req.params.assignmentId
    });
    if (!record?.lastSubmissionId) {
        return res.json({ files: [] });
    }
    const submission = await Submission.findOne({ submissionId: record.lastSubmissionId });
    if (!submission) return res.json({ files: [] });
    return res.json({ files: normalizeStoredFiles(submission.files) });
});

// ── Leaderboard (teacher-only) ───────────────────────────────────────────────

// GET /api/leaderboard — all assignments with full ranked student list
router.get('/leaderboard', requireAuth, requireRole('teacher'), async (req, res) => {
    // Get all active assignments
    const assignments = await Assignment.find({ isActive: true })
        .select('_id title description referenceScreenshotUrl referencePageScreenshots')
        .sort({ createdAt: -1 });

    // Get all student progress records in one query
    const allProgress = await StudentProgress.find({});

    // Get unique student IDs across all progress
    const studentIds = [...new Set(allProgress.map(p => p.studentId))];

    // Fetch student names/emails
    const users = await User.find({ _id: { $in: studentIds } }).select('_id name email');
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), { name: u.name, email: u.email }]));

    // Group progress by assignmentId
    const progressByAssignment = {};
    for (const p of allProgress) {
        if (!progressByAssignment[p.assignmentId]) progressByAssignment[p.assignmentId] = [];
        progressByAssignment[p.assignmentId].push(p);
    }

    // Build leaderboard per assignment
    const leaderboard = assignments.map(a => {
        const records = progressByAssignment[a._id.toString()] || [];

        // Sort: completed first (desc), then by bestScore desc
        const ranked = records
            .map((p, idx) => ({
                studentId: p.studentId,
                name: userMap[p.studentId]?.name || 'Unknown',
                email: userMap[p.studentId]?.email || '',
                bestScore: p.bestScore,
                completed: p.completed,
                completedAt: p.completedAt,
                attempts: p.attempts
            }))
            .sort((a, b) => {
                // completed first, then higher score
                if (b.completed !== a.completed) return b.completed ? 1 : -1;
                return b.bestScore - a.bestScore;
            })
            .map((s, idx) => ({ ...s, rank: idx + 1 }));

        return {
            assignmentId: a._id,
            title: a.title,
            description: a.description,
            referenceScreenshotUrl: a.referenceScreenshotUrl,
            referencePageScreenshots: a.referencePageScreenshots || [],
            totalStudents: ranked.length,
            completedCount: ranked.filter(s => s.completed).length,
            avgScore: ranked.length
                ? Math.round(ranked.reduce((sum, s) => sum + s.bestScore, 0) / ranked.length)
                : 0,
            students: ranked
        };
    });

    return res.json(leaderboard);
});

// GET /api/leaderboard/:assignmentId — single assignment ranking
router.get('/leaderboard/:assignmentId', requireAuth, requireRole('teacher'), async (req, res) => {
    const assignment = await Assignment.findById(req.params.assignmentId).select('_id title description');
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const records = await StudentProgress.find({ assignmentId: req.params.assignmentId });
    const studentIds = records.map(p => p.studentId);
    const users = await User.find({ _id: { $in: studentIds } }).select('_id name email');
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), { name: u.name, email: u.email }]));

    const ranked = records
        .map(p => ({
            studentId: p.studentId,
            name: userMap[p.studentId]?.name || 'Unknown',
            email: userMap[p.studentId]?.email || '',
            bestScore: p.bestScore,
            completed: p.completed,
            completedAt: p.completedAt,
            attempts: p.attempts
        }))
        .sort((a, b) => {
            if (b.completed !== a.completed) return b.completed ? 1 : -1;
            return b.bestScore - a.bestScore;
        })
        .map((s, idx) => ({ ...s, rank: idx + 1 }));

    return res.json({ assignment, students: ranked });
});

// GET /api/student-leaderboard — student-accessible: top 3 + own rank per assignment
router.get('/student-leaderboard', requireAuth, async (req, res) => {
    const myId = req.user.id;

    const assignments = await Assignment.find({ isActive: true })
        .select('_id title')
        .sort({ createdAt: -1 });

    const allProgress = await StudentProgress.find(
        { assignmentId: { $in: assignments.map(a => a._id.toString()) } }
    );

    const studentIds = [...new Set(allProgress.map(p => p.studentId))];
    const users = await User.find({ _id: { $in: studentIds } }).select('_id name');
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.name]));

    const progressByAssignment = {};
    for (const p of allProgress) {
        if (!progressByAssignment[p.assignmentId]) progressByAssignment[p.assignmentId] = [];
        progressByAssignment[p.assignmentId].push(p);
    }

    const result = assignments.map(a => {
        const records = progressByAssignment[a._id.toString()] || [];

        // Rank everyone
        const ranked = records
            .map(p => ({
                studentId: p.studentId,
                name: userMap[p.studentId] || 'Student',
                bestScore: p.bestScore,
                completed: p.completed,
                attempts: p.attempts
            }))
            .sort((a, b) => {
                if (b.completed !== a.completed) return b.completed ? 1 : -1;
                return b.bestScore - a.bestScore;
            })
            .map((s, idx) => ({ ...s, rank: idx + 1 }));

        const top3 = ranked.slice(0, 3);
        const me = ranked.find(s => s.studentId === myId) || null;

        return {
            assignmentId: a._id,
            title: a.title,
            totalStudents: ranked.length,
            top3,
            myRank: me ? { rank: me.rank, bestScore: me.bestScore, completed: me.completed } : null
        };
    });

    return res.json(result);
});

// GET /api/teacher/student-submission/:assignmentId/:studentId — teacher-accessible: view specific student's last submission code and result
router.get('/teacher/student-submission/:assignmentId/:studentId', requireAuth, requireRole('teacher'), async (req, res) => {
    const { assignmentId, studentId } = req.params;

    const progress = await StudentProgress.findOne({ assignmentId, studentId });
    if (!progress || !progress.lastSubmissionId) {
        return res.status(404).json({ error: 'No submission found for this student.' });
    }

    const [submission, evalRun, user] = await Promise.all([
        Submission.findOne({ submissionId: progress.lastSubmissionId }),
        EvaluationRun.findOne({ submissionId: progress.lastSubmissionId }),
        User.findById(studentId).select('name email')
    ]);

    if (!submission) {
        return res.status(404).json({ error: 'Submission data not found.' });
    }

    return res.json({
        student: user ? { name: user.name, email: user.email } : null,
        files: normalizeStoredFiles(submission.files),
        result: evalRun || null,
        bestScore: progress.bestScore,
        completed: progress.completed,
        attempts: progress.attempts
    });
});

// ── Teacher: Library Policies ─────────────────────────────────────────────────

router.get('/teacher/library-policies', requireAuth, requireRole('teacher'), async (req, res) => {
    const policies = await LibraryPolicy.find({}).sort({ name: 1, version: 1 });
    return res.json(policies);
});

router.post('/teacher/library-policies', requireAuth, requireRole('teacher'), async (req, res) => {
    const { name, version, cdnUrls } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!version?.trim()) return res.status(400).json({ error: 'version is required' });
    const urls = Array.isArray(cdnUrls) ? cdnUrls.map(u => u.trim()).filter(Boolean) : [];
    const policy = await LibraryPolicy.create({ name: name.trim(), version: version.trim(), cdnUrls: urls });
    return res.status(201).json(policy);
});

router.patch('/teacher/library-policies/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    const { name, version, cdnUrls, enabled } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (version !== undefined) update.version = version.trim();
    if (Array.isArray(cdnUrls)) update.cdnUrls = cdnUrls.map(u => u.trim()).filter(Boolean);
    if (enabled !== undefined) update.enabled = Boolean(enabled);
    const policy = await LibraryPolicy.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!policy) return res.status(404).json({ error: 'Not found' });
    return res.json(policy);
});

router.delete('/teacher/library-policies/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    await LibraryPolicy.findByIdAndDelete(req.params.id);
    await Assignment.updateMany(
        { allowedLibraryPolicyIds: req.params.id },
        { $pull: { allowedLibraryPolicyIds: req.params.id } }
    );
    return res.json({ success: true });
});

// ── Teacher: Progress Records ─────────────────────────────────────────────────

router.get('/teacher/progress', requireAuth, requireRole('teacher'), async (req, res) => {
    const { assignmentId } = req.query;
    const filter = assignmentId ? { assignmentId } : {};
    const records = await StudentProgress.find(filter).sort({ bestScore: -1 });
    const userIds = records.map(r => r.studentId);
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));
    const result = records.map(r => ({
        ...r.toObject(),
        studentName: userMap[r.studentId]?.name || 'Unknown',
        studentEmail: userMap[r.studentId]?.email || ''
    }));
    return res.json(result);
});

router.delete('/teacher/progress/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    await StudentProgress.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
});

// ── Teacher: Global Submissions ───────────────────────────────────────────────

router.get('/teacher/submissions', requireAuth, requireRole('teacher'), async (req, res) => {
    const { limit = 100, skip = 0 } = req.query;
    const progressRecords = await StudentProgress.find({})
        .select('studentId assignmentId bestSubmissionId bestScore completed attempts updatedAt')
        .sort({ updatedAt: -1 });

    const bestSubmissionIds = progressRecords.map(r => r.bestSubmissionId).filter(Boolean);
    const bestSubmissions = await Submission.find({ submissionId: { $in: bestSubmissionIds } });
    const submissionById = new Map(bestSubmissions.map(s => [s.submissionId, s]));

    const orderedSubmissions = progressRecords
        .filter(r => r.bestSubmissionId)
        .map(r => {
            const sub = submissionById.get(r.bestSubmissionId);
            return {
                submissionId: r.bestSubmissionId,
                assignmentId: r.assignmentId,
                studentId: r.studentId,
                status: sub?.status || 'missing',
                submittedAt: sub?.submittedAt || r.updatedAt,
                bestScore: r.bestScore,
                completed: r.completed,
                attempts: r.attempts
            };
        })
        .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

    const paged = orderedSubmissions.slice(Number(skip), Number(skip) + Number(limit));
    const userIds = [...new Set(paged.map(s => s.studentId).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const evalRuns = await EvaluationRun.find({ submissionId: { $in: paged.map(s => s.submissionId) } });
    const runMap = Object.fromEntries(evalRuns.map(r => [r.submissionId, r]));

    const result = paged.map(s => ({
        ...s,
        evalRun: runMap[s.submissionId] || null,
        studentName: userMap[s.studentId]?.name || 'Unknown',
        studentEmail: userMap[s.studentId]?.email || ''
    }));

    return res.json({ submissions: result, total: orderedSubmissions.length });
});

export default router;
