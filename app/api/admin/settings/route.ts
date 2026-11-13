import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { requireRole } from '@/lib/auth-guards';
import { SALON_ID } from '@/lib/utils';
import { findActiveSalonBySlug, requireSalonMembership } from '@/lib/tenancy';
import { isValidCoordinates } from '@/lib/geo';

const day = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closed: z.boolean(),
});
const coordinate = z.number().finite();
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(300),
  openingHours: z.array(day).length(7),
  latitude: coordinate.min(-90).max(90).nullable().optional(),
  longitude: coordinate.min(-180).max(180).nullable().optional(),
}).strict();

async function authorize(request: Request) {
  const slug = new URL(request.url).searchParams.get('salonSlug');
  if (!slug) {
    const legacy = await requireRole(['ADMIN']);
    if ('response' in legacy) return legacy;
    return { salonId: SALON_ID, isTenant: false as const };
  }
  const salon = await findActiveSalonBySlug(slug);
  if (!salon) return { response: NextResponse.json({ error: 'Salon not found.' }, { status: 404 }) };
  const session = await auth();
  const access = await requireSalonMembership(session, String(salon.salonId), ['OWNER', 'ADMIN', 'MANAGER']);
  if ('response' in access) return access;
  return { salonId: String(salon.salonId), isTenant: true as const };
}

export async function GET(request: Request) {
  const access = await authorize(request);
  if ('response' in access) return access.response;
  try {
    const db = await getDb();
    if (access.isTenant) {
      const [settings, salon] = await Promise.all([
        db.collection('salonSettings').findOne({ salonId: access.salonId }),
        db.collection('salons').findOne({ salonId: access.salonId }, { projection: { name: 1, phone: 1, address: 1, location: 1 } }),
      ]);
      const coordinates = (salon?.location as { coordinates?: number[] } | undefined)?.coordinates;
      return NextResponse.json({ settings: {
        ...(settings || {}),
        name: salon?.name || '',
        phone: salon?.phone || '',
        address: salon?.address || '',
        latitude: Array.isArray(coordinates) ? coordinates[1] : null,
        longitude: Array.isArray(coordinates) ? coordinates[0] : null,
      } });
    }
    const settings = await db.collection('settings').findOne({ _id: 'salon' as never });
    return NextResponse.json({ settings: settings || null });
  } catch (error) {
    console.error('settings_load_failed', error);
    return NextResponse.json({ error: 'Could not load settings.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const access = await authorize(request);
  if ('response' in access) return access.response;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid settings.' }, { status: 400 });
    const { openingHours, latitude, longitude, ...profile } = parsed.data;
    for (const hours of openingHours) {
      if (!hours.closed && hours.open >= hours.close) {
        return NextResponse.json({ error: 'Closing time must be later than opening time.' }, { status: 400 });
      }
    }

    const db = await getDb();
    const now = new Date();
    if (access.isTenant) {
      const update: { $set: Record<string, unknown>; $unset?: Record<string, ''> } = {
        $set: { ...profile, updatedAt: now },
      };
      if (latitude !== undefined || longitude !== undefined) {
        if (latitude === null && longitude === null) {
          update.$unset = { location: '' };
        } else if (latitude === null || longitude === null || latitude === undefined || longitude === undefined
          || !isValidCoordinates(latitude, longitude)) {
          return NextResponse.json({ error: 'Enter both valid latitude and longitude values.' }, { status: 400 });
        } else {
          update.$set.location = { type: 'Point', coordinates: [longitude, latitude] };
        }
      }
      await db.collection('salons').updateOne({ salonId: access.salonId, status: 'ACTIVE' }, update);
      await db.collection('salonSettings').updateOne(
        { salonId: access.salonId },
        { $set: { openingHours, updatedAt: now }, $setOnInsert: { salonId: access.salonId, timezone: 'Asia/Dhaka', createdAt: now } },
        { upsert: true },
      );
    } else {
      await db.collection('settings').updateOne(
        { _id: 'salon' as never },
        { $set: { ...profile, openingHours, salonId: access.salonId, updatedAt: now } },
        { upsert: true },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('settings_update_failed', error);
    return NextResponse.json({ error: 'Could not save settings.' }, { status: 500 });
  }
}
