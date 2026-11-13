import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { ensureIndexes } from '@/lib/db/indexes';
import { isValidCoordinates } from '@/lib/geo';

export const dynamic = 'force-dynamic';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const area = (params.get('area') || '').trim().slice(0, 80);
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const hasCoordinateParams = params.has('lat') || params.has('lng');
  const hasCoordinates = params.has('lat') && params.has('lng') && isValidCoordinates(lat, lng);
  if (hasCoordinateParams && !hasCoordinates) {
    return NextResponse.json({ error: 'Enter valid latitude and longitude coordinates.' }, { status: 400 });
  }
  const radiusKm = Math.min(50, Math.max(1, Number(params.get('radius')) || 10));

  try {
    await ensureIndexes();
    const db = await getDb();
    const collection = db.collection('salons');
    const projection = { salonId: 1, slug: 1, name: 1, address: 1, phone: 1, location: 1 };
    let salons: Record<string, unknown>[];

    if (hasCoordinates) {
      salons = await collection.find({
        status: 'ACTIVE',
        location: { $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000,
        } },
      }).project(projection).limit(100).toArray() as Record<string, unknown>[];
    } else {
      const filter: Record<string, unknown> = { status: 'ACTIVE' };
      if (area) {
        const pattern = new RegExp(escapeRegex(area), 'i');
        filter.$or = [{ name: pattern }, { address: pattern }];
      }
      salons = await collection.find(filter).project(projection).sort({ name: 1 }).limit(100).toArray() as Record<string, unknown>[];
    }

    return NextResponse.json({
      salons: salons.map((salon) => {
        const location = salon.location as { coordinates?: number[] } | undefined;
        const coordinates = location?.coordinates;
        return {
          id: String(salon.salonId || ''),
          slug: String(salon.slug || ''),
          name: String(salon.name || ''),
          address: String(salon.address || ''),
          phone: String(salon.phone || ''),
          latitude: Array.isArray(coordinates) ? coordinates[1] : null,
          longitude: Array.isArray(coordinates) ? coordinates[0] : null,
        };
      }),
      search: hasCoordinates ? { mode: 'nearby', radiusKm } : { mode: 'area', area },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('public_salon_discovery_failed', error);
    return NextResponse.json({ error: 'Salon discovery is temporarily unavailable.' }, { status: 500 });
  }
}
