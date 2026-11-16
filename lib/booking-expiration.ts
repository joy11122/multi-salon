import { ObjectId, type ClientSession, type Document, type Filter } from 'mongodb';
import { getClient, getDb } from '@/lib/db/client';

const DEFAULT_PENDING_HOLD_MINUTES = 15;
const MIN_PENDING_HOLD_MINUTES = 5;
const MAX_PENDING_HOLD_MINUTES = 120;

export function getPendingExpiryMinutes(value: unknown): number {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= MIN_PENDING_HOLD_MINUTES && minutes <= MAX_PENDING_HOLD_MINUTES
    ? minutes
    : DEFAULT_PENDING_HOLD_MINUTES;
}

export function getPendingExpiryAt(createdAt: Date, holdMinutes: number): Date {
  return new Date(createdAt.getTime() + getPendingExpiryMinutes(holdMinutes) * 60_000);
}

type ExpirationOptions = {
  salonId?: string;
  staffIds?: ObjectId[];
  overlap?: { startAt: Date; endAt: Date };
  limit?: number;
};

type PendingAppointment = {
  _id: ObjectId;
  salonId: string;
  bookingRef: string;
};

export async function expirePendingBookings(options: ExpirationOptions = {}) {
  const db = await getDb();
  const client = await getClient();
  const now = new Date();
  // Existing pending records predate pendingExpiresAt; preserve a safe 15-minute default.
  const legacyCutoff = new Date(now.getTime() - DEFAULT_PENDING_HOLD_MINUTES * 60_000);
  const filter: Filter<Document> = {
    status: 'PENDING',
    paymentStatus: { $nin: ['PAID', 'PARTIAL'] },
    $or: [
      { pendingExpiresAt: { $lte: now } },
      { pendingExpiresAt: { $exists: false }, createdAt: { $lte: legacyCutoff } },
    ],
  };

  if (options.salonId) filter.salonId = options.salonId;
  if (options.staffIds?.length) filter.staffId = { $in: options.staffIds };
  if (options.overlap) {
    filter.startAt = { $lt: options.overlap.endAt };
    filter.endAt = { $gt: options.overlap.startAt };
  }

  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const candidates = await db.collection('appointments')
    .find(filter)
    .sort({ pendingExpiresAt: 1, createdAt: 1 })
    .limit(limit)
    .project({ _id: 1, salonId: 1, bookingRef: 1 })
    .toArray() as PendingAppointment[];

  let expired = 0;
  const session: ClientSession = client.startSession();
  try {
    for (const appointment of candidates) {
      let didExpire = false;
      await session.withTransaction(async () => {
        didExpire = false;
        const result = await db.collection('appointments').updateOne(
          { ...filter, _id: appointment._id, salonId: appointment.salonId, status: 'PENDING' },
          { $set: { status: 'EXPIRED', expiredAt: now, expiryReason: 'PENDING_TIMEOUT', updatedAt: now } },
          { session },
        );
        if (!result.matchedCount) return;

        await db.collection('slotLocks').deleteMany(
          { salonId: appointment.salonId, appointmentRef: appointment.bookingRef },
          { session },
        );
        await db.collection('notifications').insertOne({
          salonId: appointment.salonId,
          type: 'BOOKING_EXPIRED',
          title: 'Pending booking expired',
          body: 'Booking ' + appointment.bookingRef + ' expired because it was not confirmed in time.',
          read: false,
          createdAt: now,
        }, { session });
        await db.collection('auditLogs').insertOne({
          salonId: appointment.salonId,
          actorId: 'SYSTEM',
          action: 'EXPIRE_PENDING_BOOKING',
          resource: 'appointments',
          resourceId: appointment.bookingRef,
          changes: { status: 'EXPIRED', reason: 'PENDING_TIMEOUT' },
          createdAt: now,
        }, { session });
        didExpire = true;
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
      if (didExpire) expired += 1;
    }
  } finally {
    await session.endSession();
  }

  return { scanned: candidates.length, expired, hasMore: candidates.length === limit };
}
