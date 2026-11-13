import { describe, expect, it } from 'vitest';
import { distanceKm, isValidCoordinates } from '@/lib/geo';

describe('salon discovery geospatial helpers', () => {
  it('returns zero for identical coordinates', () => {
    expect(distanceKm(22.8456, 89.5403, 22.8456, 89.5403)).toBe(0);
  });

  it('calculates a plausible distance between nearby Khulna coordinates', () => {
    const distance = distanceKm(22.8456, 89.5403, 22.8556, 89.5403);
    expect(distance).toBeGreaterThan(1);
    expect(distance).toBeLessThan(1.2);
  });

  it('rejects coordinates outside geographic bounds', () => {
    expect(isValidCoordinates(22.8, 89.5)).toBe(true);
    expect(isValidCoordinates(91, 89.5)).toBe(false);
    expect(isValidCoordinates(22.8, 181)).toBe(false);
    expect(isValidCoordinates(Number.NaN, 89.5)).toBe(false);
  });
});
