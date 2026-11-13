import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { getDb } from '@/lib/db/client';
import { registerSchema } from '@/lib/validations/booking';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!(await rateLimit(`register:${ip}`, 5, 60_000)).allowed) return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 });
  try {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Please check your name, email and password requirements.' }, { status: 400 });
    const { name, email, password } = parsed.data;
    const db = await getDb();
    const normalizedEmail = email.toLowerCase();
    const exists = await db.collection('users').findOne({ email: normalizedEmail }, { projection: { _id: 1 } });
    if (exists) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    const passwordHash = await hash(password, 12);
    await db.collection('users').insertOne({ name, email: normalizedEmail, passwordHash, role: 'CUSTOMER', emailVerified: null, createdAt: new Date(), updatedAt: new Date() });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    console.error('register_failed', error);
    return NextResponse.json({ error: 'Registration is temporarily unavailable.' }, { status: 500 });
  }
}
