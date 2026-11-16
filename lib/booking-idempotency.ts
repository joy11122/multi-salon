import { createHash } from 'node:crypto';

export type BookingIdempotencyInput = {
  salonId: string;
  accountEmail: string;
  input: {
    salonSlug?: string;
    serviceIds: string[];
    staffId?: string;
    date: string;
    time: string;
    customerName: string;
    phone: string;
    email?: string;
    notes?: string;
    notificationConsent?: boolean;
  };
};

export function isValidIdempotencyKey(value: string | null | undefined): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function createBookingRequestHash({ salonId, accountEmail, input }: BookingIdempotencyInput): string {
  // Explicit field order and normalized identity make retries deterministic.
  const canonical = {
    salonId,
    accountEmail: accountEmail.trim().toLowerCase(),
    salonSlug: input.salonSlug || '',
    serviceIds: [...input.serviceIds],
    staffId: input.staffId || 'any',
    date: input.date,
    time: input.time,
    customerName: input.customerName.trim(),
    phone: input.phone.replace(/[\s-]/g, ''),
    email: (input.email || '').trim().toLowerCase(),
    notes: (input.notes || '').trim(),
    notificationConsent: Boolean(input.notificationConsent),
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
