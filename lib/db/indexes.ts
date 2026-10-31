import { getDb } from './client';
let indexesPromise: Promise<void> | undefined;

export function ensureIndexes(): Promise<void> {
  if (!indexesPromise) {
    indexesPromise = (async () => {
      const db = await getDb();
      await Promise.all([
        db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true }),
        db.collection('customers').createIndex({ phone: 1 }, { unique: true }),
        db.collection('appointments').createIndex({ bookingRef: 1 }, { unique: true }),
        db.collection('appointments').createIndex({ salonId: 1, staffId: 1, startAt: 1, endAt: 1, status: 1 }),
        db.collection('appointments').createIndex({ customerId: 1, createdAt: -1 }),
        db.collection('appointments').createIndex({ salonId: 1, email: 1, startAt: -1 }),
        db.collection('slotLocks').createIndex({ salonId: 1, staffId: 1, slotKey: 1 }, { unique: true }),
        db.collection('slotLocks').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection('slotLocks').createIndex({ appointmentRef: 1 }),
        db.collection('services').createIndex({ salonId: 1, active: 1 }),
        db.collection('staff').createIndex({ salonId: 1, active: 1 }),
        db.collection('staff').createIndex({ salonId: 1, email: 1 }, { unique: true }),
        db.collection('payments').createIndex({ appointmentId: 1 }, { sparse: true }),
        db.collection('auditLogs').createIndex({ createdAt: -1 }),
      ]);
    })().catch((error) => { indexesPromise = undefined; throw error; });
  }
  return indexesPromise;
}
