import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Set MONGODB_URI before running the index migration.');

const apply = process.argv.includes('--apply');
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

const duplicateChecks = [
  ['users.email', 'users', [{ $match: { email: { $exists: true } } }, { $group: { _id: '$email', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]],
  ['salons.slug', 'salons', [{ $group: { _id: '$slug', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]],
  ['salonMemberships.salonId+email', 'salonMemberships', [{ $group: { _id: { salonId: '$salonId', email: '$email' }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]],
  ['salonMemberships.salonId+userId', 'salonMemberships', [{ $match: { userId: { $type: 'string' } } }, { $group: { _id: { salonId: '$salonId', userId: '$userId' }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]],
  ['salonSettings.salonId', 'salonSettings', [{ $group: { _id: '$salonId', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]],
  ['customers.salonId+phone', 'customers', [{ $group: { _id: { salonId: '$salonId', phone: '$phone' }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]],
  ['appointments.bookingRef', 'appointments', [{ $group: { _id: '$bookingRef', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]],
  ['slotLocks.salonId+staffId+slotKey', 'slotLocks', [{ $group: { _id: { salonId: '$salonId', staffId: '$staffId', slotKey: '$slotKey' }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]],
  ['staff.salonId+email', 'staff', [{ $match: { email: { $type: 'string', $gt: '' } } }, { $group: { _id: { salonId: '$salonId', email: '$email' }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]],
  ['staffShifts.salonId+staffId+dayOfWeek', 'staffShifts', [{ $group: { _id: { salonId: '$salonId', staffId: '$staffId', dayOfWeek: '$dayOfWeek' }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]],
  ['refunds.activeLock', 'refunds', [{ $match: { activeLock: true } }, { $group: { _id: { salonId: '$salonId', paymentId: '$paymentId' }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]],
];

const indexDefinitions = [
  ['users', { email: 1 }, { unique: true, sparse: true }]],
  ['salons', { slug: 1 }, { unique: true }]],
  ['salonMemberships', { salonId: 1, userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'string' } } }]],
  ['salonMemberships', { salonId: 1, email: 1 }, { unique: true }]],
  ['salonMemberships', { userId: 1, status: 1 }, {}]],
  ['salonSettings', { salonId: 1 }, { unique: true }]],
  ['customers', { salonId: 1, phone: 1 }, { unique: true }]],
  ['appointments', { bookingRef: 1 }, { unique: true }]],
  ['appointments', { salonId: 1, staffId: 1, startAt: 1, endAt: 1, status: 1 }, {}]],
  ['appointments', { salonId: 1, customerId: 1, createdAt: -1 }, {}]],
  ['appointments', { salonId: 1, email: 1, startAt: -1 }, {}]],
  ['slotLocks', { salonId: 1, staffId: 1, slotKey: 1 }, { unique: true }]],
  ['slotLocks', { expiresAt: 1 }, { expireAfterSeconds: 0 }]],
  ['slotLocks', { salonId: 1, appointmentRef: 1 }, {}]],
  ['services', { salonId: 1, active: 1 }, {}]],
  ['staff', { salonId: 1, active: 1 }, {}]],
  ['staff', { salonId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string', $gt: '' } } }]],
  ['payments', { salonId: 1, appointmentId: 1 }, { sparse: true }]],
  ['auditLogs', { salonId: 1, createdAt: -1 }, {}]],
  ['notifications', { salonId: 1, createdAt: -1 }, {}]],
  ['staffShifts', { salonId: 1, staffId: 1, dayOfWeek: 1 }, { unique: true }]],
  ['staffLeave', { salonId: 1, staffId: 1, date: 1 }, {}]],
  ['notificationDeliveries', { salonId: 1, bookingRef: 1, createdAt: -1 }, {}]],
  ['refunds', { salonId: 1, paymentId: 1, createdAt: -1 }, {}]],
  ['refunds', { salonId: 1, paymentId: 1 }, { unique: true, partialFilterExpression: { activeLock: true } }]],
  ['monitoringEvents', { createdAt: -1, severity: 1 }, {}]],
  ['salons', { location: '2dsphere' }, { name: 'salon_location_2dsphere', partialFilterExpression: { location: { $type: 'object' } } }]],
];

async function listIndexes(collection) {
  try { return await collection.listIndexes().toArray(); }
  catch (error) { if (error?.code === 26) return []; throw error; }
}

await client.connect();
try {
  const db = client.db(process.env.MONGODB_DB_NAME || undefined);
  const duplicateReport = [];
  for (const [label, collectionName, pipeline] of duplicateChecks) {
    const duplicates = await db.collection(collectionName).aggregate([...pipeline, { $limit: 20 }]).toArray();
    if (duplicates.length) duplicateReport.push({ index: label, examples: duplicates });
  }

  const legacyIndexes = [];
  const customerIndexes = await listIndexes(db.collection('customers'));
  if (customerIndexes.some((index) => index.name === 'phone_1')) legacyIndexes.push({ collection: 'customers', name: 'phone_1' });
  const staffIndexes = await listIndexes(db.collection('staff'));
  const oldStaffEmailIndex = staffIndexes.find((index) => index.name === 'salonId_1_email_1' && !index.partialFilterExpression);
  if (oldStaffEmailIndex) legacyIndexes.push({ collection: 'staff', name: oldStaffEmailIndex.name });
  const salonIndexes = await listIndexes(db.collection('salons'));
  const oldLocationIndex = salonIndexes.find((index) => index.name === 'salon_location_2dsphere' && (
    index.key?.location !== '2dsphere' ||
    JSON.stringify(index.partialFilterExpression) !== JSON.stringify({ location: { $type: 'object' } })
  ));
  if (oldLocationIndex) legacyIndexes.push({ collection: 'salons', name: oldLocationIndex.name });

  console.log(JSON.stringify({
    mode: apply ? 'APPLY' : 'DRY_RUN',
    database: db.databaseName,
    duplicateGroups: duplicateReport,
    legacyIndexesToReplace: legacyIndexes,
    indexesToEnsure: indexDefinitions.length,
  }, null, 2));

  if (duplicateReport.length) {
    throw new Error('Duplicate records must be resolved before unique indexes can be applied. No indexes were changed.');
  }
  if (!apply) {
    console.log('Dry run only. Back up the database, review the report, then rerun with --apply.');
  } else {
    for (const legacy of legacyIndexes) await db.collection(legacy.collection).dropIndex(legacy.name);
    for (const [collectionName, keys, options] of indexDefinitions) {
      await db.collection(collectionName).createIndex(keys, options);
    }
    console.log('Index migration completed. Verify the resulting indexes and booking flows.');
  }
} finally {
  await client.close();
}
