/**
 * utils/rateLimit.js
 * ------------------------------------------------------------
 * A minimal fixed-window rate limiter, keyed by client IP.
 * Demonstrates the 429 "Too Many Requests" status code called
 * out in the training kit. Not production-grade (an in-memory
 * Map won't survive a restart or scale across processes) --
 * but the concept transfers directly to Redis-backed limiters.
 * ------------------------------------------------------------
 */

const WINDOW_MS = 10_000; // 10 second window
const MAX_REQUESTS = 20; // per window, per client

const hits = new Map();

function isRateLimited(clientId) {
  const now = Date.now();
  const entry = hits.get(clientId);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(clientId, { windowStart: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

module.exports = { isRateLimited };
