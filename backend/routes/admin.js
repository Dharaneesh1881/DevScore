import { Router } from 'express';
import { adminLogin, requireAdmin } from '../middleware/adminAuth.js';
import Assignment from '../models/Assignment.js';
import StudentProgress from '../models/StudentProgress.js';
import Submission from '../models/Submission.js';
import EvaluationRun from '../models/EvaluationRun.js';
import User from '../models/User.js';
import LibraryPolicy from '../models/LibraryPolicy.js';
import { buildPage } from '../worker/pageBuilder.js';
import {
  normalizeAllowedDomains,
  resolveAllowedDomains
} from '../worker/networkPolicy.js';
import { captureBaseline } from '../worker/baselineCapture.js';
import { createRedisClient } from '../utils/redis.js';

const router = Router();

// ── Auth ─────────────────────────────────────────────────────────────────────
// POST /api/admin/login
router.post('/admin/login', adminLogin);

// ── Dashboard Stats ──────────────────────────────────────────────────────────
// GET /api/admin/stats
router.get('/admin/stats', requireAdmin, async (req, res) => {
    const [assignments, users, transientSubmissionCount, evalRuns, progress] = await Promise.all([
        Assignment.countDocuments(),
        User.countDocuments(),
        Submission.countDocuments({ status: { $in: ['pending', 'processing', 'error'] } }),
        EvaluationRun.countDocuments(),
        StudentProgress.find({})
    ]);

    const bestSubmissionCount = new Set(
        progress.map((record) => record.bestSubmissionId).filter(Boolean)
    ).size;
    const submissions = bestSubmissionCount + transientSubmissionCount;

    const completedCount = progress.filter(p => p.completed).length;
    const avgScore = progress.length
        ? Math.round(progress.reduce((s, p) => s + p.bestScore, 0) / progress.length)
        : 0;

    // Score distribution buckets
    const dist = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    for (const p of progress) {
        if (p.bestScore <= 20) dist['0-20']++;
        else if (p.bestScore <= 40) dist['21-40']++;
        else if (p.bestScore <= 60) dist['41-60']++;
        else if (p.bestScore <= 80) dist['61-80']++;
        else dist['81-100']++;
    }

    return res.json({
        assignments,
        users,
        submissions,
        evalRuns,
        completedCount,
        totalProgress: progress.length,
        avgScore,
        scoreDistribution: dist
    });
});

// ── Users ─────────────────────────────────────────────────────────────────────
// GET /api/admin/users
router.get('/admin/users', requireAdmin, async (req, res) => {
    const users = await User.find({}).select('-passwordHash').sort({ createdAt: -1 });
    return res.json(users);
});

// DELETE /api/admin/users/:id
router.delete('/admin/users/:id', requireAdmin, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    await StudentProgress.deleteMany({ studentId: req.params.id });
    return res.json({ success: true, message: 'User and progress deleted.' });
});

// ── Assignments ───────────────────────────────────────────────────────────────
// GET /api/admin/assignments
router.get('/admin/assignments', requireAdmin, async (req, res) => {
    const assignments = await Assignment.find({}).sort({ createdAt: -1 });
    const progressByAssignment = await StudentProgress.aggregate([
        { $group: { _id: '$assignmentId', count: { $sum: 1 }, avgScore: { $avg: '$bestScore' }, completed: { $sum: { $cond: ['$completed', 1, 0] } } } }
    ]);
    const statsMap = Object.fromEntries(progressByAssignment.map(p => [p._id, p]));
    const result = assignments.map(a => ({
        ...a.toObject(),
        stats: statsMap[a._id.toString()] || { count: 0, avgScore: 0, completed: 0 }
    }));
    return res.json(result);
});

// PATCH /api/admin/assignments/:id/toggle — toggle isActive
router.patch('/admin/assignments/:id/toggle', requireAdmin, async (req, res) => {
    const a = await Assignment.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    a.isActive = !a.isActive;
    await a.save();
    return res.json({ _id: a._id, isActive: a.isActive });
});

// DELETE /api/admin/assignments/:id
router.delete('/admin/assignments/:id', requireAdmin, async (req, res) => {
    const submissions = await Submission.find({ assignmentId: req.params.id }).select('submissionId');
    const sids = submissions.map(s => s.submissionId);
    await Promise.all([
        Assignment.findByIdAndDelete(req.params.id),
        Submission.deleteMany({ assignmentId: req.params.id }),
        EvaluationRun.deleteMany({ submissionId: { $in: sids } }),
        StudentProgress.deleteMany({ assignmentId: req.params.id })
    ]);
    return res.json({ success: true });
});

// ── Submissions ────────────────────────────────────────────────────────────────
// GET /api/admin/submissions?assignmentId=&studentId=&limit=50&skip=0
router.get('/admin/submissions', requireAdmin, async (req, res) => {
    const { assignmentId, studentId, limit = 50, skip = 0 } = req.query;
    const filter = {};
    if (assignmentId) filter.assignmentId = assignmentId;
    if (studentId) filter.studentId = studentId;

    const [progressRecords, transientSubmissions] = await Promise.all([
        StudentProgress.find(filter)
            .select('studentId assignmentId bestSubmissionId bestScore completed attempts updatedAt')
            .sort({ updatedAt: -1 }),
        Submission.find({
            ...filter,
            status: { $in: ['pending', 'processing', 'error'] }
        }).sort({ submittedAt: -1 })
    ]);

    const bestSubmissionIds = progressRecords
        .map((record) => record.bestSubmissionId)
        .filter(Boolean);

    const bestSubmissions = await Submission.find({ submissionId: { $in: bestSubmissionIds } });
    const submissionById = new Map(bestSubmissions.map((submission) => [submission.submissionId, submission]));
    const progressBySubmissionId = new Map(
        progressRecords
            .filter((record) => record.bestSubmissionId)
            .map((record) => [record.bestSubmissionId, record])
    );

    const merged = new Map();

    for (const record of progressRecords) {
        if (!record.bestSubmissionId) continue;

        const submission = submissionById.get(record.bestSubmissionId);
        if (submission) {
            merged.set(record.bestSubmissionId, {
                ...submission.toObject(),
                bestScore: record.bestScore,
                completed: record.completed,
                attempts: record.attempts
            });
            continue;
        }

        merged.set(record.bestSubmissionId, {
            submissionId: record.bestSubmissionId,
            assignmentId: record.assignmentId,
            studentId: record.studentId,
            status: 'missing',
            submittedAt: record.updatedAt,
            files: [],
            bestScore: record.bestScore,
            completed: record.completed,
            attempts: record.attempts
        });
    }

    for (const submission of transientSubmissions) {
        if (!merged.has(submission.submissionId)) {
            merged.set(submission.submissionId, submission.toObject());
        }
    }

    const orderedSubmissions = Array.from(merged.values()).sort((a, b) =>
        new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    );

    const pagedSubmissions = orderedSubmissions.slice(Number(skip), Number(skip) + Number(limit));
    const sids = pagedSubmissions.map(s => s.submissionId);
    const evalRuns = await EvaluationRun.find({ submissionId: { $in: sids } });
    const runMap = Object.fromEntries(evalRuns.map(r => [r.submissionId, r]));

    const userIds = [...new Set(pagedSubmissions.map(s => s.studentId).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const result = pagedSubmissions.map(s => ({
        ...s,
        bestScore: s.bestScore ?? progressBySubmissionId.get(s.submissionId)?.bestScore ?? null,
        completed: s.completed ?? progressBySubmissionId.get(s.submissionId)?.completed ?? false,
        attempts: s.attempts ?? progressBySubmissionId.get(s.submissionId)?.attempts ?? null,
        evalRun: runMap[s.submissionId] || null,
        studentName: userMap[s.studentId]?.name || 'Unknown',
        studentEmail: userMap[s.studentId]?.email || ''
    }));

    return res.json({ submissions: result, total: orderedSubmissions.length });
});

// GET /api/admin/submissions/:submissionId — full detail
router.get('/admin/submissions/:submissionId', requireAdmin, async (req, res) => {
    let [submission, evalRun] = await Promise.all([
        Submission.findOne({ submissionId: req.params.submissionId }),
        EvaluationRun.findOne({ submissionId: req.params.submissionId })
    ]);

    let user = null;
    if (!submission) {
        const progress = await StudentProgress.findOne({ bestSubmissionId: req.params.submissionId });
        if (!progress) return res.status(404).json({ error: 'Not found' });

        user = await User.findById(progress.studentId).select('name email');
        submission = {
            submissionId: progress.bestSubmissionId,
            assignmentId: progress.assignmentId,
            studentId: progress.studentId,
            status: evalRun ? 'done' : 'missing',
            submittedAt: progress.updatedAt,
            files: []
        };
    } else {
        user = await User.findById(submission.studentId).select('name email');
    }

    return res.json({ submission, evalRun: evalRun || null, student: user });
});

// POST /api/admin/submissions/:submissionId/replay — re-queue for evaluation
router.post('/admin/submissions/:submissionId/replay', requireAdmin, async (req, res) => {
    const submission = await Submission.findOne({ submissionId: req.params.submissionId });
    if (!submission) return res.status(404).json({ error: 'Not found' });

    // Reset status and delete old eval run
    submission.status = 'pending';
    await submission.save();
    await EvaluationRun.deleteOne({ submissionId: req.params.submissionId });

    // Re-queue via the same BullMQ queue
    const { Queue } = await import('bullmq');
    const connection = createRedisClient();
    const evalQueue = new Queue('evaluation', { connection });
    await evalQueue.add('evaluate', {
        submissionId: submission.submissionId,
        assignmentId: submission.assignmentId,
        files: submission.files
    });
    await connection.quit();

    return res.json({ success: true, message: 'Submission re-queued for evaluation.' });
});

// ── Progress ──────────────────────────────────────────────────────────────────
// GET /api/admin/progress?assignmentId=
router.get('/admin/progress', requireAdmin, async (req, res) => {
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

// DELETE /api/admin/progress/:id — delete a single progress record
router.delete('/admin/progress/:id', requireAdmin, async (req, res) => {
    await StudentProgress.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
});

// ── Library Policies ──────────────────────────────────────────────────────────
// GET /api/admin/library-policies
router.get('/admin/library-policies', requireAdmin, async (req, res) => {
    const policies = await LibraryPolicy.find({}).sort({ name: 1, version: 1 });
    return res.json(policies);
});

// POST /api/admin/library-policies
router.post('/admin/library-policies', requireAdmin, async (req, res) => {
    const { name, version, cdnUrls } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!version?.trim()) return res.status(400).json({ error: 'version is required' });
    const urls = Array.isArray(cdnUrls) ? cdnUrls.map(u => u.trim()).filter(Boolean) : [];
    const policy = await LibraryPolicy.create({ name: name.trim(), version: version.trim(), cdnUrls: urls });
    return res.status(201).json(policy);
});

// PATCH /api/admin/library-policies/:id  (update version / urls / enabled)
router.patch('/admin/library-policies/:id', requireAdmin, async (req, res) => {
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

// DELETE /api/admin/library-policies/:id
router.delete('/admin/library-policies/:id', requireAdmin, async (req, res) => {
    await LibraryPolicy.findByIdAndDelete(req.params.id);
    // Also remove this policy from any assignment that referenced it
    await Assignment.updateMany(
        { allowedLibraryPolicyIds: req.params.id },
        { $pull: { allowedLibraryPolicyIds: req.params.id } }
    );
    return res.json({ success: true });
});

// PATCH /api/admin/assignments/:id/library-policies  — set which policies apply to an assignment
// Also extracts CDN domains from policy URLs and merges into allowedCdnDomains automatically
router.patch('/admin/assignments/:id/library-policies', requireAdmin, async (req, res) => {
    const { policyIds } = req.body;
    if (!Array.isArray(policyIds)) return res.status(400).json({ error: 'policyIds must be an array' });

    // Fetch the policies to extract their domains
    const policies = policyIds.length > 0
        ? await LibraryPolicy.find({ _id: { $in: policyIds }, enabled: true })
        : [];

    // Extract hostnames from policy CDN URL prefixes
    const policyDomains = [];
    for (const policy of policies) {
        for (const cdnUrl of policy.cdnUrls || []) {
            try {
                const { hostname } = new URL(cdnUrl);
                if (hostname && !policyDomains.includes(hostname)) policyDomains.push(hostname);
            } catch { /* skip invalid URLs */ }
        }
    }

    // Fetch current assignment to merge domains
    const current = await Assignment.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Assignment not found' });

    // Merge policy domains into existing allowedCdnDomains
    const existingDomains = current.allowedCdnDomains || [];
    const mergedDomains = normalizeAllowedDomains([...existingDomains, ...policyDomains]);

    const assignment = await Assignment.findByIdAndUpdate(
        req.params.id,
        { $set: { allowedLibraryPolicyIds: policyIds, allowedCdnDomains: mergedDomains } },
        { new: true }
    );
    return res.json({
        assignmentId: assignment._id,
        allowedLibraryPolicyIds: assignment.allowedLibraryPolicyIds,
        allowedCdnDomains: assignment.allowedCdnDomains
    });
});

// POST /api/admin/assignments/:id/regenerate-baseline
// Re-captures reference screenshots using the assignment's current CDN policy config
router.post('/admin/assignments/:id/regenerate-baseline', requireAdmin, async (req, res) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    if (!assignment.files || assignment.files.length === 0)
        return res.status(400).json({ error: 'Assignment has no files to render' });

    // Resolve allowed domains + URL prefixes from library policies
    const allowedDomains = resolveAllowedDomains(assignment.allowedCdnDomains);
    const policyIds = assignment.allowedLibraryPolicyIds || [];
    const activePolicies = policyIds.length > 0
        ? await LibraryPolicy.find({ _id: { $in: policyIds }, enabled: true })
        : [];
    const allowedUrlPrefixes = activePolicies.flatMap(p => p.cdnUrls || []);

    try {
        const { pageFilePaths, bundle } = await buildPage(`baseline-${assignment._id}`, assignment.files);
        const viewportNames = assignment.evalSpec?.viewports?.length > 0
            ? assignment.evalSpec.viewports
            : ['desktop'];

        const { referenceScreenshotUrl, referenceScreenshots, referencePageScreenshots } =
            await captureBaseline({
                bundle,
                pageFilePaths,
                assignmentId: assignment._id,
                viewportNames,
                allowedDomains,
                allowedUrlPrefixes
            });

        await Assignment.findByIdAndUpdate(assignment._id, {
            referenceScreenshotUrl,
            referenceScreenshots,
            referencePageScreenshots,
            baselineGeneratedAt: new Date()
        });

        return res.json({
            success: true,
            referenceScreenshotUrl,
            screenshotCount: referenceScreenshots.length
        });

    } catch (err) {
        console.error('Baseline regeneration failed:', err.message);
        return res.status(500).json({ error: 'Baseline regeneration failed: ' + err.message });
    }
});

export default router;
