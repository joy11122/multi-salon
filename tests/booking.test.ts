import { describe, expect, it } from 'vitest';
import { bookingSchema } from '../lib/validations/booking';
import { addMinutes, bookingReference, getDhakaDate, toDhakaDateTime } from '../lib/utils';

const validBooking = {
  serviceIds: ['65a000000000000000000001'],
  staffId: 'any',
  date: '2027-01-10',
  time: '10:30',
  customerName: 'Rahim Uddin',
  phone: '01712345678',
  email: '',
  notes: '',
};

describe('booking validation', () => {
  it('accepts valid Bangladesh booking details', () => {
    expect(bookingSchema.safeParse(validBooking).success).toBe(true);
  });
  it('rejects invalid Bangladesh mobile numbers', () => {
    expect(bookingSchema.safeParse({ ...validBooking, phone: '123' }).success).toBe(false);
  });
  it('rejects invalid time strings', () => {
    expect(bookingSchema.safeParse({ ...validBooking, time: '25:70' }).success).toBe(false);
  });
  it('normalizes Bangladesh mobile numbers with spaces', () => {
    const result = bookingSchema.safeParse({ ...validBooking, phone: '+880 1712 345678' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe('+8801712345678');
  });
  it('rejects impossible calendar dates', () => {
    expect(bookingSchema.safeParse({ ...validBooking, date: '2027-02-31' }).success).toBe(false);
  });
});

describe('Dhaka date helpers', () => {
  it('converts Bangladesh wall-clock time to UTC correctly', () => {
    expect(toDhakaDateTime('2027-01-10', '10:00').toISOString()).toBe('2027-01-10T04:00:00.000Z');
  });
  it('adds duration in minutes', () => {
    expect(addMinutes(new Date('2027-01-10T04:00:00Z'), 45).toISOString()).toBe('2027-01-10T04:45:00.000Z');
  });
  it('generates a reference with the expected prefix', () => {
    expect(bookingReference()).toMatch(/^TGC-\d{4}-[A-F0-9]{6}$/);
  });
  it('formats date in Dhaka timezone', () => {
    expect(getDhakaDate(new Date('2027-01-10T18:30:00Z'))).toBe('2027-01-11');
  });
});


describe('booking slot locks', () => {
  it('creates every 15-minute lock bucket touched by a booking', async () => {
    const { buildSlotLockKeys } = await import('../lib/booking-slots');
    const keys = buildSlotLockKeys(new Date('2027-01-10T04:00:00Z'), new Date('2027-01-10T05:00:00Z'));
    expect(keys).toEqual([
      '2027-01-10T04:00:00.000Z',
      '2027-01-10T04:15:00.000Z',
      '2027-01-10T04:30:00.000Z',
      '2027-01-10T04:45:00.000Z',
    ]);
  });

  it('shares a lock for partially overlapping bookings', async () => {
    const { buildSlotLockKeys } = await import('../lib/booking-slots');
    const first = buildSlotLockKeys(new Date('2027-01-10T04:00:00Z'), new Date('2027-01-10T05:00:00Z'));
    const second = buildSlotLockKeys(new Date('2027-01-10T04:30:00Z'), new Date('2027-01-10T05:30:00Z'));
    expect(first.some((key) => second.includes(key))).toBe(true);
  });

  it('does not share a lock when one booking starts exactly as another ends', async () => {
    const { buildSlotLockKeys } = await import('../lib/booking-slots');
    const first = buildSlotLockKeys(new Date('2027-01-10T04:00:00Z'), new Date('2027-01-10T05:00:00Z'));
    const second = buildSlotLockKeys(new Date('2027-01-10T05:00:00Z'), new Date('2027-01-10T05:30:00Z'));
    expect(first.some((key) => second.includes(key))).toBe(false);
  });

  it('rejects invalid intervals and slot sizes', async () => {
    const { buildSlotLockKeys } = await import('../lib/booking-slots');
    expect(() => buildSlotLockKeys(new Date('invalid'), new Date())).toThrow(RangeError);
    expect(() => buildSlotLockKeys(new Date('2027-01-10T04:00:00Z'), new Date('2027-01-10T04:00:00Z'))).toThrow(RangeError);
    expect(() => buildSlotLockKeys(new Date('2027-01-10T04:00:00Z'), new Date('2027-01-10T04:15:00Z'), 0)).toThrow(RangeError);
  });
});
