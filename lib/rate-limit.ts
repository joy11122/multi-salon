type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

/** Process-local fallback limiter. Use a shared Redis/KV limiter for multi-instance production deployments. */
export function rateLimit(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  if (buckets.size > 10_000) for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count) };
}
