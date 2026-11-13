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

      // Replace the legacy staff email index before creating the partial
      // tenant-scoped index. Older deployments created the same index name
      // without a partialFilterExpression, which MongoDB rejects as a spec conflict.
      const staff = db.collection('staff');
      try {
        const existingIndexes = await staff.listIndexes().toArray();
        const legacyEmailIndex = existingIndexes.find((index) => index.name === 'salonId_1_email_1');
        if (legacyEmailIndex && !legacyEmailIndex.partialFilterExpression) {
          await staff.dropIndex('salonId_1_email_1');
        }
      } catch (error) {
        const mongoError = error as { code?: number };
        // Another serverless instance may have removed the same legacy index.
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
        db.collection('staffShifts').createIndex({ salonId: 1, staffId: 1, dayOfWeek: 1 }, { unique: true }),
        db.collection('staffLeave').createIndex({ salonId: 1, staffId: 1, date: 1 }),
        db.collection('notificationDeliveries').createIndex({ salonId: 1, bookingRef: 1, createdAt: -1 }),
        db.collection('refunds').createIndex({ salonId: 1, paymentId: 1, createdAt: -1 }),
        db.collection('monitoringEvents').createIndex({ createdAt: -1, severity: 1 }),
      ]);
    })().catch((error) => {
      indexesPromise = undefined;
      throw error;
    });
  }
  return indexesPromise;
}
