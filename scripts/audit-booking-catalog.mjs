import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Set MONGODB_URI before running the catalog audit.');

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
await client.connect();

try {
  const db = client.db(process.env.MONGODB_DB_NAME || undefined);
  const salons = await db.collection('salons')
    .find({}, { projection: { _id: 0, salonId: 1, slug: 1, name: 1, status: 1 } })
    .sort({ slug: 1 })
    .toArray();

  const summarize = async (collectionName) => {
    const collection = db.collection(collectionName);
    const [bySalonId, missingSalonId] = await Promise.all([
      collection.aggregate([
        { $group: {
          _id: { $ifNull: ['$salonId', '(missing salonId)'] },
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$active', 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$active', false] }, 1, 0] } },
        } },
        { $sort: { total: -1 } },
      ]).toArray(),
      collection.countDocuments({ $or: [{ salonId: { $exists: false } }, { salonId: null }, { salonId: '' }] }),
    ]);
    return { bySalonId, missingSalonId };
  };

  const [services, staff] = await Promise.all([
    summarize('services'),
    summarize('staff'),
  ]);

  console.log(JSON.stringify({
    mode: 'READ ONLY — no documents or indexes are modified',
    database: process.env.MONGODB_DB_NAME || '(database selected by URI)',
    salons,
    catalog: { services, staff },
    guidance: 'Compare each catalog salonId with the salonId of its intended salon. Do not reassign records unless ownership has been verified.',
  }, null, 2));
} finally {
  await client.close();
}
