import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri && process.env.NODE_ENV !== 'test') {
  // Keep module import safe during static builds; actual DB calls fail with a clear message.
}

type MongoCache = { client: MongoClient | null; promise: Promise<MongoClient> | null };
const globalWithMongo = globalThis as typeof globalThis & { _mongo?: MongoCache };
const cache = globalWithMongo._mongo ?? { client: null, promise: null };
if (process.env.NODE_ENV !== 'production') globalWithMongo._mongo = cache;

export async function getClient(): Promise<MongoClient> {
  if (!uri) throw new Error('MONGODB_URI is not configured. Add your MongoDB Atlas connection string.');
  if (cache.client) return cache.client;
  if (!cache.promise) {
    cache.promise = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 }).connect().catch((error) => { cache.promise = null; throw error; });
  }
  cache.client = await cache.promise;
  return cache.client;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  const dbName = process.env.MONGODB_DB_NAME;
  return dbName ? client.db(dbName) : client.db();
}
