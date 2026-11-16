import { describe, expect, it } from 'vitest';
import { createBookingRequestHash, isValidIdempotencyKey } from '../lib/booking-idempotency';

const input = {
  salonId: 'salon-joy',
  accountEmail: 'user@example.com',
  input: {
    serviceIds: ['65a000000000000000000001'],
    staffId: 'any',
    date: '2027-01-10',
    time: '10:30',
    customerName: 'Rahim Uddin',
    phone: '01712345678',
    email: '',
    notes: '',
    notificationConsent: false,
  },
};

describe('booking idempotency', () => {
  it('accepts UUID request keys and rejects malformed values', () => {
    expect(isValidIdempotencyKey('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidIdempotencyKey('not-a-uuid')).toBe(false);
    expect(isValidIdempotencyKey(null)).toBe(false);
  });

  it('creates the same hash for the same canonical request', () => {
    expect(createBookingRequestHash(input)).toBe(createBookingRequestHash(input));
  });

  it('normalizes phone, email and whitespace before hashing', () => {
    const normalized = {
      ...input,
      accountEmail: ' USER@example.com ',
      input: { ...input.input, phone: '01712 345678', customerName: ' Rahim Uddin ' },
    };
    expect(createBookingRequestHash(input)).toBe(createBookingRequestHash(normalized));
  });

  it('changes the hash when booking intent changes', () => {
    expect(createBookingRequestHash(input)).not.toBe(createBookingRequestHash({
      ...input,
      input: { ...input.input, time: '11:00' },
    }));
  });

  it('keeps any-staff intent independent from the staff assigned by the server', () => {
    expect(createBookingRequestHash(input)).toBe(createBookingRequestHash({
      ...input,
      input: { ...input.input, staffId: 'any' },
    }));
  });

  it('scopes the hash to the salon and request identity', () => {
    expect(createBookingRequestHash(input)).not.toBe(createBookingRequestHash({ ...input, salonId: 'another-salon' }));
    expect(createBookingRequestHash(input)).not.toBe(createBookingRequestHash({ ...input, accountEmail: 'other@example.com' }));
  });
});
