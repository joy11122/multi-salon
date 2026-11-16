import { describe, expect, it } from 'vitest';
import { getPendingExpiryAt, getPendingExpiryMinutes } from '../lib/booking-expiration';

describe('pending booking expiry policy', () => {
  it('uses a 15-minute default when no salon value exists', () => {
    expect(getPendingExpiryMinutes(undefined)).toBe(15);
  });

  it('accepts configured hold durations between 5 and 120 minutes', () => {
    expect(getPendingExpiryMinutes(5)).toBe(5);
    expect(getPendingExpiryMinutes(45)).toBe(45);
    expect(getPendingExpiryMinutes(120)).toBe(120);
  });

  it('falls back safely for invalid hold durations', () => {
    expect(getPendingExpiryMinutes(4)).toBe(15);
    expect(getPendingExpiryMinutes(121)).toBe(15);
    expect(getPendingExpiryMinutes('abc')).toBe(15);
    expect(getPendingExpiryMinutes(15.5)).toBe(15);
  });

  it('calculates the expiry timestamp from booking creation time', () => {
    const createdAt = new Date('2026-11-17T04:00:00.000Z');
    expect(getPendingExpiryAt(createdAt, 20).toISOString()).toBe('2026-11-17T04:20:00.000Z');
  });
});
