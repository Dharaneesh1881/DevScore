import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/groups — teacher lists their groups
router.get('/groups', requireAuth, requireRole('teacher'), async (req, res) => {
  const groups = await req.db.Group.find({ teacherId: req.user.id, industryId: req.user.industryId })
    .sort({ createdAt: -1 });
  return res.json(groups);
});

// POST /api/groups — teacher creates a group
router.post('/groups', requireAuth, requireRole('teacher'), async (req, res) => {
  const { name, studentIds = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const group = await req.db.Group.create({
    name: name.trim(),
    industryId: req.user.industryId,
    teacherId:  req.user.id,
    studentIds: Array.isArray(studentIds) ? studentIds : []
  });
  return res.status(201).json(group);
});

// PATCH /api/groups/:id — rename or update studentIds
router.patch('/groups/:id', requireAuth, requireRole('teacher'), async (req, res) => {
  const { name, studentIds } = req.body;
  const update = {};
  if (name !== undefined)           update.name       = name.trim();
  if (Array.isArray(studentIds))    update.studentIds = studentIds;

  if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  const group = await req.db.Group.findOneAndUpdate(
    { _id: req.params.id, teacherId: req.user.id },
    { $set: update },
    { new: true }
  );
  if (!group) return res.status(404).json({ error: 'Group not found' });
  return res.json(group);
});

// POST /api/groups/:id/students — add students to a group
router.post('/groups/:id/students', requireAuth, requireRole('teacher'), async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'studentIds must be a non-empty array' });
  }
  const group = await req.db.Group.findOneAndUpdate(
    { _id: req.params.id, teacherId: req.user.id },
    { $addToSet: { studentIds: { $each: studentIds } } },
    { new: true }
  );
  if (!group) return res.status(404).json({ error: 'Group not found' });
  return res.json(group);
});

// DELETE /api/groups/:id/students/:studentId — remove one student from a group
router.delete('/groups/:id/students/:studentId', requireAuth, requireRole('teacher'), async (req, res) => {
  const group = await req.db.Group.findOneAndUpdate(
    { _id: req.params.id, teacherId: req.user.id },
    { $pull: { studentIds: req.params.studentId } },
    { new: true }
  );
  if (!group) return res.status(404).json({ error: 'Group not found' });
  return res.json(group);
});

// DELETE /api/groups/:id — delete group; remove its id from assignments
router.delete('/groups/:id', requireAuth, requireRole('teacher'), async (req, res) => {
  const { Group, Assignment } = req.db;
  const group = await Group.findOneAndDelete({ _id: req.params.id, teacherId: req.user.id });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  await Assignment.updateMany(
    { groupIds: req.params.id },
    { $pull: { groupIds: req.params.id } }
  );
  return res.json({ success: true });
});

export default router;
