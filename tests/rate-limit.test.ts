import { describe, expect, it } from 'vitest';
import { rateLimit } from '../lib/rate-limit';

describe('rateLimit', () => {
  it('allows requests up to the configured threshold', () => {
    const key = `test-${Date.now()}-allow`;
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 2, 60_000).allowed).toBe(false);
  });
});
