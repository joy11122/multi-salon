import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Set MONGODB_URI before running the seed script.');
const client = new MongoClient(uri);
await client.connect();
try {
  const db = client.db(process.env.MONGODB_DB_NAME || undefined);
  const salonId = process.env.SALON_ID || 'the-gentlemens-club-khulna';
  const services = [
    { name: 'The Signature Cut', description: 'A tailored haircut, finished with precision and considered detail.', category: 'Hair', price: 300, durationMinutes: 45, active: true, sortOrder: 1 },
    { name: 'Beard Sculpting', description: 'Defined lines, balanced shape and a clean, confident finish.', category: 'Beard', price: 180, durationMinutes: 30, active: true, sortOrder: 2 },
    { name: 'The Royal Shave', description: 'A traditional hot towel shave with a modern touch.', category: 'Shave', price: 250, durationMinutes: 30, active: true, sortOrder: 3 },
    { name: 'Cut & Beard', description: 'A complete haircut and beard grooming experience.', category: 'Package', price: 450, durationMinutes: 60, active: true, sortOrder: 4 },
  ];
  for (const service of services) await db.collection('services').updateOne({ salonId, name: service.name }, { $setOnInsert: { ...service, salonId, createdAt: new Date(), updatedAt: new Date(), demoData: true } }, { upsert: true });
  const openingHours = Array.from({ length: 7 }, () => ({ open: process.env.SALON_OPEN_TIME || '10:00', close: process.env.SALON_CLOSE_TIME || '20:00', closed: false }));
  await db.collection('settings').updateOne({ _id: 'salon' }, { $setOnInsert: { salonId, name: "The Gentlemen's Club", phone: '', address: '', openingHours, timezone: 'Asia/Dhaka', createdAt: new Date() } }, { upsert: true });
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true }),
    db.collection('customers').createIndex({ phone: 1 }, { unique: true }),
    db.collection('appointments').createIndex({ bookingRef: 1 }, { unique: true }),
    db.collection('appointments').createIndex({ salonId: 1, staffId: 1, startAt: 1, endAt: 1, status: 1 }),
    db.collection('appointments').createIndex({ salonId: 1, email: 1, startAt: -1 }),
    db.collection('slotLocks').createIndex({ salonId: 1, staffId: 1, slotKey: 1 }, { unique: true }),
    db.collection('slotLocks').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('slotLocks').createIndex({ appointmentRef: 1 }),
    db.collection('staff').createIndex({ salonId: 1, email: 1 }, { unique: true }),
  ]);
  console.log('Seed complete. Demo service prices and default opening hours must be reviewed before launch. Add real staff from the admin dashboard.');
} finally { await client.close(); }
