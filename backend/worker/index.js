import 'dotenv/config';
import http from 'http';
import { Worker } from 'bullmq';
import { masterConnection } from '../db/masterDb.js';
import { redisConnection } from '../queue/index.js';
import { runEvaluation } from './evaluator.js';
import { getTenantConnection, getTenantModels } from '../db/connections.js';

// ── Minimal HTTP server for Render health check ───────────────────────────────
const PORT = process.env.WORKER_PORT || 3002;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Worker OK');
}).listen(PORT, () => console.log(`Worker health-check server listening on port ${PORT}`));

// Wait for master DB to be ready (needed if worker reconnects at startup)
masterConnection.asPromise().then(() => console.log('Worker: Master DB connected'));

// ── BullMQ worker ─────────────────────────────────────────────────────────────
const worker = new Worker('evaluation', async (job) => {
  const { submissionId, assignmentId, industrySlug } = job.data;
  console.log(`Worker: picked up job for submissionId ${submissionId} [${industrySlug}]`);

  if (!industrySlug) throw new Error('industrySlug missing from job data');

  const conn = await getTenantConnection(industrySlug);
  const { Submission } = getTenantModels(conn);

  await Submission.updateOne({ submissionId }, { status: 'processing' });

  try {
    await runEvaluation(submissionId, assignmentId, industrySlug);
    await Submission.updateOne({ submissionId }, { status: 'done' });
    console.log(`Worker: completed ${submissionId}`);
  } catch (err) {
    console.error(`Worker: error for ${submissionId}:`, err.message);
    await Submission.updateOne({ submissionId }, { status: 'error' });
    throw err;
  }
}, {
  connection: redisConnection,
  concurrency: 1
});

worker.on('completed', (job) => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err.message));
console.log('Evaluation worker started');
