import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit } from "../lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => { delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; });
  it("allows requests up to the configured threshold", async () => {
    const key = "test-" + Date.now() + "-allow";
    expect((await rateLimit(key, 2, 60_000)).allowed).toBe(true);
    expect((await rateLimit(key, 2, 60_000)).allowed).toBe(true);
    expect((await rateLimit(key, 2, 60_000)).allowed).toBe(false);
  });
});
