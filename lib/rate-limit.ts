import { createHash } from "node:crypto";
import { getDb } from "@/lib/db/client";

type LimitResult = { allowed: boolean; remaining: number; resetAt: number };
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
let warned = false;
let mongoIndexPromise: Promise<void> | undefined;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Shared production fixed-window limiter.
 * Uses Upstash when configured and MongoDB as a shared fallback, so every
 * Vercel instance enforces the same limits even without Redis credentials.
 */
async function mongoRateLimit(key: string, limit: number, windowMs: number): Promise<LimitResult> {
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  const resetAt = (window + 1) * windowMs;
  const id = hash(key) + ":" + window;
  const db = await getDb();

  if (!mongoIndexPromise) {
    mongoIndexPromise = db.collection("rateLimitBuckets")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "rate_limit_expiry" })
      .then(() => undefined)
      .catch((error) => {
        mongoIndexPromise = undefined;
        throw error;
      });
  }
  await mongoIndexPromise;

  const collection = db.collection("rateLimitBuckets");
  let record;
  try {
    record = await collection.findOneAndUpdate(
      { _id: id },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          resetAt: new Date(resetAt),
          expiresAt: new Date(resetAt + windowMs),
          createdAt: new Date(now),
        },
      },
      { upsert: true, returnDocument: "after" },
    );
  } catch (error) {
    // Concurrent first requests can race on the same deterministic _id.
    if ((error as { code?: number }).code !== 11000) throw error;
    record = await collection.findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 } },
      { returnDocument: "after" },
    );
  }

  const count = Number(record?.count || 0);
  return { allowed: count > 0 && count <= limit, remaining: Math.max(0, limit - count), resetAt };
}

export async function rateLimit(key: string, limit = 8, windowMs = 60_000): Promise<LimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const redisKey = "multi-salon:ratelimit:" + hash(key);
    const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; local ttl=redis.call('PTTL',KEYS[1]); return {n,ttl}";
    try {
      const response = await fetch(url.replace(/\\/$/, ""), {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify(["EVAL", script, "1", redisKey, String(windowMs)]),
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
      });
      if (!response.ok) throw new Error("Shared rate limiter unavailable (" + response.status + ").");
      const payload = await response.json() as { result?: [number, number]; error?: string };
      if (payload.error || !Array.isArray(payload.result)) throw new Error("Shared rate limiter returned an invalid response.");
      const count = Number(payload.result[0]);
      const ttl = Number(payload.result[1]);
      return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt: Date.now() + Math.max(0, ttl) };
    } catch (error) {
      console.error("upstash_rate_limiter_unavailable_using_mongodb_fallback", error);
    }
  } else if (!warned) {
    warned = true;
    console.warn("SECURITY_CONFIGURATION: Upstash is not configured; using the shared MongoDB rate-limit store.");
  }

  try {
    return await mongoRateLimit(key, limit, windowMs);
  } catch (error) {
    console.error("shared_mongodb_rate_limiter_failed_closed", error);
    if (process.env.NODE_ENV === "production") {
      return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
    }
    const now = Date.now();
    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
    }
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs };
    }
    current.count += 1;
    return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
  }
}
