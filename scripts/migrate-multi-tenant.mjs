import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Set MONGODB_URI before running the multi-tenant migration.');

const apply = process.argv.includes('--apply');
const assignUnscopedRecords = process.argv.includes('--assign-unscoped-records');
const requestedSalonSlug = String(process.env.SALON_SLUG || '').trim().toLowerCase();
const configuredSalonId = process.env.SALON_ID || '';
const salonSlug = (requestedSalonSlug || 'the-gentlemens-club-khulna')
  .toLowerCase()
  .trim()
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
const collections = ['services', 'staff', 'customers', 'appointments', 'payments', 'slotLocks', 'auditLogs', 'notifications', 'offers', 'reviews'];

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(salonSlug) || salonSlug.length < 3 || salonSlug.length > 60) {
  throw new Error('SALON_SLUG must be a valid lowercase URL slug between 3 and 60 characters.');
}

const client = new MongoClient(uri);
await client.connect();

try {
  const db = client.db(process.env.MONGODB_DB_NAME || undefined);
  let salonId = configuredSalonId || 'the-gentlemens-club-khulna';
  let targetSalon = null;
  if (requestedSalonSlug) {
    targetSalon = await db.collection('salons').findOne({ slug: salonSlug, status: 'ACTIVE' });
    if (!targetSalon || !targetSalon.salonId) {
      throw new Error(`No active salon found for SALON_SLUG="${salonSlug}". Refusing to create a replacement tenant.`);
    }
    if (configuredSalonId && String(targetSalon.salonId) !== configuredSalonId) {
      throw new Error('SALON_ID does not match the salon resolved from SALON_SLUG.');
    }
    salonId = String(targetSalon.salonId);
  }
  const settings = await db.collection('settings').findOne({ _id: 'salon' });
  const tenantSettings = targetSalon
    ? await db.collection('salonSettings').findOne({ salonId })
    : null;
  const name = process.env.SALON_NAME || targetSalon?.name || settings?.name || "The Gentlemen's Club";
  const now = new Date();

  const missingCounts = {};
  for (const collectionName of collections) {
    missingCounts[collectionName] = await db.collection(collectionName).countDocuments({ salonId: { $exists: false } });
  }

  const catalogBySalonId = {};
  for (const collectionName of ['services', 'staff']) {
    catalogBySalonId[collectionName] = await db.collection(collectionName).aggregate([
      { $group: { _id: '$salonId', total: { $sum: 1 }, active: { $sum: { $cond: ['$active', 1, 0] } } } },
      { $sort: { total: -1 } },
      { $limit: 100 },
    ]).toArray();
  }

  const duplicateStaffEmails = await db.collection('staff').aggregate([
    { $match: { $or: [{ salonId }, { salonId: { $exists: false } }], email: { $type: 'string', $ne: '' } } },
    { $group: { _id: { $toLower: { $trim: { input: '$email' } } }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 },
  ]).toArray();

  const duplicatePhones = await db.collection('customers').aggregate([
    { $match: { $or: [{ salonId }, { salonId: { $exists: false } }] } },
    { $group: { _id: '$phone', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 },
  ]).toArray();

  console.log(JSON.stringify({
    mode: apply ? 'APPLY' : 'DRY RUN',
    salon: { salonId, slug: salonSlug, name },
    documentsMissingSalonId: missingCounts,
    existingCatalogRecordsBySalonId: catalogBySalonId,
    targetSalonResolvedFromSlug: targetSalon ? { salonId, slug: salonSlug, name: targetSalon.name } : null,
    unscopedRecordAssignmentEnabled: assignUnscopedRecords,
    note: 'Existing records with a non-empty salonId are never reassigned. Unscoped records are assigned only when --assign-unscoped-records is explicitly supplied.',
    duplicateCustomerPhones: duplicatePhones,
    duplicateStaffEmails: duplicateStaffEmails,
    warning: 'Back up the production database before applying this migration.',
  }, null, 2));

  if (!apply) {
    console.log('Dry run only. Re-run with --apply after reviewing the plan and taking a database backup.');
    process.exitCode = 0;
  } else {
    if (Object.values(missingCounts).some((count) => count > 0) && !assignUnscopedRecords) {
      throw new Error('Unscoped records were found. Review the dry-run report, then rerun with --assign-unscoped-records only if all unscoped records belong to this salon.');
    }
    if (duplicatePhones.length) throw new Error('Duplicate customer phone numbers exist in the legacy salon. Resolve them before creating the tenant-scoped unique index.');
    if (duplicateStaffEmails.length) throw new Error('Duplicate staff email addresses exist in the legacy salon. Resolve them case-insensitively before creating the tenant-scoped unique index.');

    const slugOwner = await db.collection('salons').findOne({ slug: salonSlug, salonId: { $ne: salonId } });
    if (slugOwner) throw new Error('SALON_SLUG is already assigned to a different salon.');

    for (const collectionName of collections) {
      await db.collection(collectionName).updateMany(
        { salonId: { $exists: false } },
        { $set: { salonId } },
      );
    }

    await db.collection('salons').updateOne(
      { salonId },
      {
        $set: {
          slug: salonSlug,
          name,
          phone: targetSalon?.phone ?? settings?.phone ?? '',
          address: targetSalon?.address ?? settings?.address ?? '',
          timezone: targetSalon?.timezone || tenantSettings?.timezone || settings?.timezone || 'Asia/Dhaka',
          status: 'ACTIVE',
          updatedAt: now,
        },
        $setOnInsert: { _id: salonId, salonId, createdAt: now },
      },
      { upsert: true },
    );

    const openingHours = tenantSettings?.openingHours || settings?.openingHours || Array.from({ length: 7 }, () => ({ open: '10:00', close: '20:00', closed: false }));
    await db.collection('salonSettings').updateOne(
      { salonId },
      {
        $set: { openingHours, timezone: targetSalon?.timezone || tenantSettings?.timezone || settings?.timezone || 'Asia/Dhaka', updatedAt: now },
        $setOnInsert: { salonId, createdAt: now },
      },
      { upsert: true },
    );

    const ownerEmails = (process.env.ADMIN_EMAILS || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    for (const email of ownerEmails) {
      const user = await db.collection('users').findOne({ email }, { projection: { _id: 1 } });
      await db.collection('salonMemberships').updateOne(
        { salonId, email },
        {
          $set: { ...(user ? { userId: String(user._id) } : {}), role: 'OWNER', status: 'ACTIVE', updatedAt: now },
          $setOnInsert: { salonId, email, invitedAt: now, createdAt: now },
        },
        { upsert: true },
      );
    }

    const staffMembers = await db.collection('staff').find({ salonId, active: true, email: { $type: 'string' } }).toArray();
    for (const staff of staffMembers) {
      const email = String(staff.email).trim().toLowerCase();
      if (!email) continue;
      await db.collection('staff').updateOne({ _id: staff._id, salonId }, { $set: { email } });
      const existing = await db.collection('salonMemberships').findOne({ salonId, email });
      if (existing) continue;
      const user = await db.collection('users').findOne({ email }, { projection: { _id: 1 } });
      await db.collection('salonMemberships').insertOne({
        salonId,
        email,
        ...(user ? { userId: String(user._id) } : {}),
        role: 'STAFF',
        status: 'ACTIVE',
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    try {
      await db.collection('customers').dropIndex('phone_1');
    } catch (error) {
      const mongoError = error;
      if (mongoError.code !== 27 && mongoError.code !== 26) throw error;
    }

    await Promise.all([
      db.collection('salons').createIndex({ slug: 1 }, { unique: true }),
      db.collection('salonMemberships').createIndex({ salonId: 1, email: 1 }, { unique: true }),
      db.collection('salonMemberships').createIndex(
        { salonId: 1, userId: 1 },
        { unique: true, partialFilterExpression: { userId: { $type: 'string' } } },
      ),
      db.collection('salonSettings').createIndex({ salonId: 1 }, { unique: true }),
      db.collection('customers').createIndex({ salonId: 1, phone: 1 }, { unique: true }),
      db.collection('staff').createIndex({ salonId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string', $gt: '' } } }),
      db.collection('services').createIndex({ salonId: 1, active: 1 }),
      db.collection('appointments').createIndex({ bookingRef: 1 }, { unique: true }),
      db.collection('appointments').createIndex({ salonId: 1, staffId: 1, startAt: 1, endAt: 1, status: 1 }),
      db.collection('appointments').createIndex({ salonId: 1, email: 1, startAt: -1 }),
      db.collection('slotLocks').createIndex({ salonId: 1, staffId: 1, slotKey: 1 }, { unique: true }),
      db.collection('slotLocks').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('payments').createIndex({ salonId: 1, appointmentId: 1 }, { sparse: true }),
      db.collection('auditLogs').createIndex({ salonId: 1, createdAt: -1 }),
      db.collection('notifications').createIndex({ salonId: 1, createdAt: -1 }),
    ]);

    console.log('Migration applied. Verify the salon owner can sign in and access /salons/' + salonSlug + '/admin.');
  }
} finally {
  await client.close();
}
