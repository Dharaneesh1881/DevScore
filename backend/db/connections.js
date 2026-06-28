import mongoose from 'mongoose';
import { userSchema } from '../models/schemas/user.schema.js';
import { assignmentSchema } from '../models/schemas/assignment.schema.js';
import { submissionSchema } from '../models/schemas/submission.schema.js';
import { evaluationRunSchema } from '../models/schemas/evaluationRun.schema.js';
import { studentProgressSchema } from '../models/schemas/studentProgress.schema.js';
import { libraryPolicySchema } from '../models/schemas/libraryPolicy.schema.js';
import { groupSchema } from '../models/schemas/group.schema.js';

const tenantConnections = new Map();
const tenantModelCaches = new WeakMap();

function getTenantUri(industrySlug) {
  if (process.env.MONGO_BASE_URI) return `${process.env.MONGO_BASE_URI}/devscore_${industrySlug}`;
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/web_eval';
  return uri.replace(/\/[^/?]+(\?|$)/, `/devscore_${industrySlug}$1`);
}

export async function getTenantConnection(industrySlug) {
  if (tenantConnections.has(industrySlug)) {
    return tenantConnections.get(industrySlug);
  }
  const conn = await mongoose.createConnection(getTenantUri(industrySlug)).asPromise();
  conn.on('error', (err) => console.error(`Tenant DB [${industrySlug}] error:`, err));
  tenantConnections.set(industrySlug, conn);
  return conn;
}

export function getTenantModels(conn) {
  if (tenantModelCaches.has(conn)) return tenantModelCaches.get(conn);

  const models = {
    User:            conn.models.User            || conn.model('User', userSchema),
    Assignment:      conn.models.Assignment      || conn.model('Assignment', assignmentSchema),
    Submission:      conn.models.Submission      || conn.model('Submission', submissionSchema),
    EvaluationRun:   conn.models.EvaluationRun   || conn.model('EvaluationRun', evaluationRunSchema),
    StudentProgress: conn.models.StudentProgress || conn.model('StudentProgress', studentProgressSchema),
    LibraryPolicy:   conn.models.LibraryPolicy   || conn.model('LibraryPolicy', libraryPolicySchema),
    Group:           conn.models.Group           || conn.model('Group', groupSchema),
  };

  tenantModelCaches.set(conn, models);
  return models;
}
