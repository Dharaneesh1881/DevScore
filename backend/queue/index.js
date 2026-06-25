import { Queue } from 'bullmq';
import { createRedisClient } from '../utils/redis.js';

export const redisConnection = createRedisClient();

export const evaluationQueue = new Queue('evaluation', {
  connection: redisConnection
});
