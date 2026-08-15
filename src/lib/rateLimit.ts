// src/lib/rateLimit.ts

interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

/**
 * Clean up expired timestamps periodically (every 5 minutes)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    record.timestamps = record.timestamps.filter(ts => ts > now - 300000);
    if (record.timestamps.length === 0) {
      memoryStore.delete(key);
    }
  }
}, 300000);

export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60000
): { success: boolean; limit: number; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Keep timestamps within the window
  record.timestamps = record.timestamps.filter(ts => ts > windowStart);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetMs = oldest + windowMs - now;
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs: Math.max(0, resetMs)
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    limit,
    remaining: limit - record.timestamps.length,
    resetMs: windowMs
  };
}
