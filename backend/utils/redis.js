import IORedis from 'ioredis';

/**
 * Creates an IORedis client.
 * Supports REDIS_URL (Upstash / production) and REDIS_HOST+PORT (local dev).
 *
 * ioredis v5 quirk: passing new IORedis(url, options) treats url as hostname.
 * Solution: pass only an options object always, parsing the URL manually.
 */
export function createRedisClient(extraOptions = {}) {
  const url = process.env.REDIS_URL;

  console.log('[Redis] Connecting via:', url ? `REDIS_URL (${url.substring(0, 20)}...)` : `REDIS_HOST=${process.env.REDIS_HOST || 'localhost'}`);

  if (url) {
    // Strip the protocol prefix so new URL() can parse it correctly
    // e.g. "rediss://user:pass@host:port" → parse host, port, tls, password
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      throw new Error(`Invalid REDIS_URL: ${e.message}`);
    }

    return new IORedis({
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      tls: parsed.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...extraOptions
    });
  }

  // Local dev: use REDIS_HOST + REDIS_PORT
  return new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...extraOptions
  });
}
