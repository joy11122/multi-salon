type LimitResult = { allowed: boolean; remaining: number; resetAt: number };
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
let warned = false;

/** Shared Upstash fixed-window limiter; local memory is development/test only. */
export async function rateLimit(key: string, limit = 8, windowMs = 60_000): Promise<LimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const redisKey = "multi-salon:ratelimit:" + createHash("sha256").update(key).digest("hex");
    const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; local ttl=redis.call('PTTL',KEYS[1]); return {n,ttl}";
    try {
      const response = await fetch(url.replace(/\/$/, ""), { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(["EVAL", script, "1", redisKey, String(windowMs)]), cache: "no-store", signal: AbortSignal.timeout(2500) });
      if (!response.ok) throw new Error("Shared rate limiter unavailable (" + response.status + ").");
      const payload = await response.json() as { result?: [number, number]; error?: string };
      if (payload.error || !Array.isArray(payload.result)) throw new Error("Shared rate limiter returned an invalid response.");
      const count = payload.result[0], ttl = payload.result[1];
      return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: Date.now() + Math.max(0, ttl) };
    } catch (error) {
      console.error("shared_rate_limiter_failed_closed", error);
      return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
    }
  }
  if (process.env.NODE_ENV === "production") {
    if (!warned) { warned = true; console.error("SECURITY_CONFIGURATION: Upstash Redis credentials are required for production rate limiting."); }
    return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
  }
  const now = Date.now();
  if (buckets.size > 10_000) for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs }; }
  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}
