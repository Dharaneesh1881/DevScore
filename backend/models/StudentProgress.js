import mongoose from 'mongoose';

/**
 * Tracks each student's progress per assignment.
 * - bestScore        : highest totalScore achieved so far (0-100, used for completion/ranking)
 * - lastSubmissionId : the most recently submitted submissionId
 * - lastScore        : the score of the last submission
 * - completed        : true when bestScore >= 50
 * - completedAt      : timestamp of first time score hit >= 50
 * - attempts         : total number of submissions made
 */
const studentProgressSchema = new mongoose.Schema({
    studentId: { type: String, required: true },
    assignmentId: { type: String, required: true },
    bestScore: { type: Number, default: 0 },
    lastSubmissionId: { type: String, default: null },
    lastScore: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

// One record per student+assignment pair
studentProgressSchema.index({ studentId: 1, assignmentId: 1 }, { unique: true });

export default mongoose.model('StudentProgress', studentProgressSchema);
