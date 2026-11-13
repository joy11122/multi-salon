import { describe, expect, it } from 'vitest';

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(toLat - fromLat);
  const dLng = radians(toLng - fromLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

describe('salon discovery distance', () => {
  it('returns zero for identical coordinates', () => {
    expect(distanceKm(22.8456, 89.5403, 22.8456, 89.5403)).toBe(0);
  });

  it('calculates a plausible distance between nearby Khulna coordinates', () => {
    const distance = distanceKm(22.8456, 89.5403, 22.8556, 89.5403);
    expect(distance).toBeGreaterThan(1);
    expect(distance).toBeLessThan(1.2);
  });
});
