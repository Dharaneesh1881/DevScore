import 'dotenv/config';
import http from 'http';
import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { redisConnection } from '../queue/index.js';
import { runEvaluation } from './evaluator.js';
import Submission from '../models/Submission.js';

// ── Minimal HTTP server so Render's free Web Service tier keeps us alive ──────
// Render requires a web process to bind a port and pass a health check.
// This tiny server responds 200 OK — the real work happens in the BullMQ worker below.
const PORT = process.env.WORKER_PORT || 3002; // intentionally NOT using PORT (that belongs to the main backend)
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Worker OK');
}).listen(PORT, () => console.log(`Worker health-check server listening on port ${PORT}`));

// ── BullMQ worker ─────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/web_eval');
mongoose.connection.on('connected', () => console.log('Worker: MongoDB connected'));

const worker = new Worker('evaluation', async (job) => {
  const { submissionId, assignmentId } = job.data;
  console.log(`Worker: picked up job for submissionId ${submissionId}`);

  await Submission.updateOne({ submissionId }, { status: 'processing' });

  try {
    await runEvaluation(submissionId, assignmentId);
    await Submission.updateOne({ submissionId }, { status: 'done' });
    console.log(`Worker: completed ${submissionId}`);
  } catch (err) {
    console.error(`Worker: error for ${submissionId}:`, err.message);
    await Submission.updateOne({ submissionId }, { status: 'error' });
    throw err;   // re-throw so BullMQ retries
  }
}, {
  connection: redisConnection,
  concurrency: 1   // process one evaluation at a time (Puppeteer is heavy)
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

console.log('Evaluation worker started');
