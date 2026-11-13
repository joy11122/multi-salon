const DEFAULT_SLOT_MINUTES = 15;

/**
 * Returns every fixed UTC time bucket touched by [startAt, endAt).
 * The half-open interval means a booking ending at 11:00 does not block
 * another booking beginning at exactly 11:00.
 */
export function buildSlotLockKeys(
  startAt: Date,
  endAt: Date,
  slotMinutes = DEFAULT_SLOT_MINUTES,
): string[] {
  const start = startAt.getTime();
  const end = endAt.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new RangeError('Booking end must be after a valid booking start.');
  }
  if (!Number.isInteger(slotMinutes) || slotMinutes < 1 || slotMinutes > 60) {
    throw new RangeError('Slot size must be a whole number between 1 and 60 minutes.');
  }

  const slotMs = slotMinutes * 60_000;
  const keys: string[] = [];
  for (let bucket = Math.floor(start / slotMs) * slotMs; bucket < end; bucket += slotMs) {
    keys.push(new Date(bucket).toISOString());
  }
  return keys;
}
