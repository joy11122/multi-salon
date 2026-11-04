import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getClient, getDb } from '@/lib/db/client';
import { ensureIndexes } from '@/lib/db/indexes';
import { createSalonSlug, salonSlugSchema } from '@/lib/tenancy';
import { rateLimit } from '@/lib/rate-limit';

const createSalonSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().optional(),
  phone: z.string().trim().max(30).default(''),
  address: z.string().trim().max(300).default(''),
}).strict();

const defaultOpeningHours = Array.from({ length: 7 }, () => ({
  open: '10:00',
  close: '20:00',
  closed: false,
}));

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const email = String(session.user.email || '').trim().toLowerCase();
    const identities: Record<string, string>[] = [{ userId: session.user.id }];
    if (email) identities.push({ email });

    const db = await getDb();
    const memberships = await db.collection('salonMemberships').find({
      status: 'ACTIVE',
      $or: identities,
    }).project({ salonId: 1, role: 1 }).toArray();
    const salonIds = memberships.map((membership) => String(membership.salonId));
    if (!salonIds.length) return NextResponse.json({ salons: [] });

    const salons = await db.collection('salons').find({
      salonId: { $in: salonIds },
      status: 'ACTIVE',
    }).project({ name: 1, slug: 1, status: 1, phone: 1, address: 1 }).sort({ name: 1 }).toArray();

    const roleBySalon = new Map(memberships.map((membership) => [String(membership.salonId), String(membership.role)]));
    return NextResponse.json({
      salons: salons.map((salon) => ({
        id: String(salon.salonId),
        name: salon.name,
        slug: salon.slug,
        phone: salon.phone || '',
        address: salon.address || '',
        role: roleBySalon.get(String(salon.salonId)) || 'STAFF',
      })),
    });
  } catch (error) {
    console.error('salon_memberships_list_failed', error);
    return NextResponse.json({ error: 'Could not load your salons.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Sign in with an account that has an email address to create a salon.' }, { status: 401 });
  }

  if (!rateLimit(`salon-create:${session.user.id}`, 5, 60 * 60_000).allowed) {
    return NextResponse.json({ error: 'You have reached the salon creation limit. Try again later.' }, { status: 429 });
  }

  const ownerCount = await (await getDb()).collection('salonMemberships').countDocuments({
    userId: session.user.id,
    role: 'OWNER',
    status: 'ACTIVE',
  });
  if (ownerCount >= 5) {
    return NextResponse.json({ error: 'An account can own up to five salon workspaces.' }, { status: 403 });
  }

  const parsed = createSalonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid salon details.' }, { status: 400 });
  }

  const requestedSlug = parsed.data.slug || createSalonSlug(parsed.data.name);
  const slugResult = salonSlugSchema.safeParse(requestedSlug);
  if (!slugResult.success) {
    return NextResponse.json({ error: slugResult.error.issues[0]?.message || 'Choose a valid salon URL.' }, { status: 400 });
  }

  const slug = slugResult.data;
  if (['admin', 'api', 'login', 'register', 'dashboard', 'salons', 'booking', 'services'].includes(slug)) {
    return NextResponse.json({ error: 'That salon URL is reserved. Please choose another.' }, { status: 409 });
  }

  const db = await getDb();
  const client = await getClient();
  const salonId = randomUUID();
  const now = new Date();
  const email = String(session.user.email).trim().toLowerCase();
  const mongoSession = client.startSession();

  try {
    await ensureIndexes();

    await mongoSession.withTransaction(async () => {
      await db.collection('salons').insertOne({
        _id: salonId,
        salonId,
        slug,
        name: parsed.data.name,
        phone: parsed.data.phone,
        address: parsed.data.address,
        timezone: 'Asia/Dhaka',
        status: 'ACTIVE',
        createdBy: session.user.id,
        createdAt: now,
        updatedAt: now,
      }, { session: mongoSession });

      await db.collection('salonMemberships').insertOne({
        salonId,
        userId: session.user.id,
        email,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      }, { session: mongoSession });

      await db.collection('salonSettings').insertOne({
        salonId,
        openingHours: defaultOpeningHours,
        timezone: 'Asia/Dhaka',
        createdAt: now,
        updatedAt: now,
      }, { session: mongoSession });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });

    return NextResponse.json({
      success: true,
      salon: { id: salonId, name: parsed.data.name, slug, role: 'OWNER' },
    }, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'That salon URL is already in use. Choose another URL.' }, { status: 409 });
    }
    console.error('salon_create_failed', error);
    return NextResponse.json({ error: 'Could not create the salon. Please try again.' }, { status: 500 });
  } finally {
    await mongoSession.endSession();
  }
}
