import { Queue } from 'bullmq';
import { createRedisClient } from '../utils/redis.js';

export const redisConnection = createRedisClient();

export const evaluationQueue = new Queue('evaluation', {
  connection: redisConnection,
  // Upstash does not allow the INFO command — skip BullMQ's version check
  skipVersionCheck: true
});
