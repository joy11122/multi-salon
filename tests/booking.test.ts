import { describe, expect, it } from 'vitest';
import { bookingSchema } from '../lib/validations/booking';
import { addMinutes, bookingReference, getDhakaDate, toDhakaDateTime } from '../lib/utils';
import { bookingConflictsWithShift } from '../lib/shifts';

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

describe('staff shift booking conflicts', () => {
  const booking = {
    startAt: new Date('2027-01-10T04:00:00.000Z'),
    endAt: new Date('2027-01-10T04:45:00.000Z'),
  };
  const shift = { dayOfWeek: 0, startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] };

  it('allows a booking inside scheduled hours', () => {
    expect(bookingConflictsWithShift(booking, shift)).toBe(false);
  });
  it('detects a booking outside scheduled hours', () => {
    expect(bookingConflictsWithShift({ ...booking, startAt: new Date('2027-01-10T02:00:00.000Z'), endAt: new Date('2027-01-10T02:45:00.000Z') }, shift)).toBe(true);
  });
  it('detects a booking overlapping a staff break', () => {
    expect(bookingConflictsWithShift({ ...booking, startAt: new Date('2027-01-10T07:30:00.000Z'), endAt: new Date('2027-01-10T08:15:00.000Z') }, shift)).toBe(true);
  });
  it('ignores appointments on another weekday', () => {
    expect(bookingConflictsWithShift({ ...booking, startAt: new Date('2027-01-11T04:00:00.000Z'), endAt: new Date('2027-01-11T04:45:00.000Z') }, shift)).toBe(false);
  });
  it('allows an appointment that starts during an overnight shift and ends after midnight', () => {
    const overnight = { dayOfWeek: 0, startTime: '22:00', endTime: '02:00' };
    const startAt = toDhakaDateTime('2027-01-10', '23:30');
    expect(bookingConflictsWithShift({ startAt, endAt: addMinutes(startAt, 60) }, overnight)).toBe(false);
  });
  it('allows early-morning appointments covered by the previous weekday overnight shift', () => {
    const overnight = { dayOfWeek: 0, startTime: '22:00', endTime: '02:00' };
    const startAt = toDhakaDateTime('2027-01-11', '00:30');
    expect(bookingConflictsWithShift({ startAt, endAt: addMinutes(startAt, 30) }, overnight)).toBe(false);
  });
  it('rejects appointments after an overnight shift ends', () => {
    const overnight = { dayOfWeek: 0, startTime: '22:00', endTime: '02:00' };
    const startAt = toDhakaDateTime('2027-01-11', '02:15');
    expect(bookingConflictsWithShift({ startAt, endAt: addMinutes(startAt, 30) }, overnight)).toBe(true);
  });
  it('detects breaks that cross midnight in an overnight shift', () => {
    const overnight = { dayOfWeek: 0, startTime: '22:00', endTime: '06:00', breaks: [{ startTime: '00:00', endTime: '00:30' }] };
    const startAt = toDhakaDateTime('2027-01-11', '00:15');
    expect(bookingConflictsWithShift({ startAt, endAt: addMinutes(startAt, 30) }, overnight)).toBe(true);
  });
});
