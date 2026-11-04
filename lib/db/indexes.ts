import { getDb } from './client';

let indexesPromise: Promise<void> | undefined;

export function ensureIndexes(): Promise<void> {
  if (!indexesPromise) {
    indexesPromise = (async () => {
      const db = await getDb();
      const customers = db.collection('customers');

      // The legacy single-salon index prevented the same customer visiting
      // multiple salons. Remove it before creating the tenant-scoped index.
      try {
        await customers.dropIndex('phone_1');
      } catch (error) {
        const mongoError = error as { code?: number };
        if (mongoError.code !== 27 && mongoError.code !== 26) throw error;
      }

      await Promise.all([
        db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true }),
        db.collection('salons').createIndex({ slug: 1 }, { unique: true }),
        db.collection('salonMemberships').createIndex(
          { salonId: 1, userId: 1 },
          { unique: true, partialFilterExpression: { userId: { $type: 'string' } } },
        ),
        db.collection('salonMemberships').createIndex({ salonId: 1, email: 1 }, { unique: true }),
        db.collection('salonMemberships').createIndex({ userId: 1, status: 1 }),
        db.collection('salonSettings').createIndex({ salonId: 1 }, { unique: true }),
        customers.createIndex({ salonId: 1, phone: 1 }, { unique: true }),
        db.collection('appointments').createIndex({ bookingRef: 1 }, { unique: true }),
        db.collection('appointments').createIndex({ salonId: 1, staffId: 1, startAt: 1, endAt: 1, status: 1 }),
        db.collection('appointments').createIndex({ salonId: 1, customerId: 1, createdAt: -1 }),
        db.collection('appointments').createIndex({ salonId: 1, email: 1, startAt: -1 }),
        db.collection('slotLocks').createIndex({ salonId: 1, staffId: 1, slotKey: 1 }, { unique: true }),
        db.collection('slotLocks').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection('slotLocks').createIndex({ salonId: 1, appointmentRef: 1 }),
        db.collection('services').createIndex({ salonId: 1, active: 1 }),
        db.collection('staff').createIndex({ salonId: 1, active: 1 }),
        db.collection('staff').createIndex({ salonId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string', $gt: '' } } }),
        db.collection('payments').createIndex({ salonId: 1, appointmentId: 1 }, { sparse: true }),
        db.collection('auditLogs').createIndex({ salonId: 1, createdAt: -1 }),
        db.collection('notifications').createIndex({ salonId: 1, createdAt: -1 }),
      ]);
    })().catch((error) => {
      indexesPromise = undefined;
      throw error;
    });
  }
  return indexesPromise;
}
