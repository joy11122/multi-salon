import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!(await rateLimit(`public-barbers:${ip}`, 60, 60_000)).allowed) return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  try {
    const db = await getDb();
    const salons = await db.collection('salons')
      .find({ status: 'ACTIVE' })
      .project({ salonId: 1, slug: 1, name: 1, address: 1 })
      .sort({ name: 1 })
      .limit(500)
      .toArray();

    if (!salons.length) {
      return NextResponse.json({ items: [], salons: [] }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      });
    }

    const salonIds = salons.map((salon) => String(salon.salonId));
    const staff = await db.collection('staff')
      .find({ salonId: { $in: salonIds }, active: true })
      .project({ salonId: 1, name: 1, title: 1, bio: 1, specialties: 1, image: 1, imageUrl: 1 })
      .sort({ name: 1 })
      .limit(2000)
      .toArray();

    const salonById = new Map(salons.map((salon) => [String(salon.salonId), salon]));
    const items = staff.flatMap((person) => {
      const salon = salonById.get(String(person.salonId));
      if (!salon || typeof salon.slug !== 'string') return [];
      const image = typeof person.imageUrl === 'string' ? person.imageUrl
        : typeof person.image === 'string' ? person.image : '';
      return [{
        id: String(person._id),
        name: String(person.name || 'Team member'),
        title: String(person.title || 'BARBER'),
        bio: String(person.bio || ''),
        specialties: Array.isArray(person.specialties)
          ? person.specialties.filter((value): value is string => typeof value === 'string').slice(0, 8)
          : [],
        imageUrl: image,
        salon: {
          name: String(salon.name || 'Salon'),
          slug: salon.slug,
          address: String(salon.address || ''),
        },
      }];
    });

    return NextResponse.json({
      items,
      salons: salons.filter((salon) => typeof salon.slug === 'string')
        .map((salon) => ({ name: String(salon.name || 'Salon'), slug: salon.slug })),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('public_barbers_directory_failed', error);
    return NextResponse.json({ error: 'Barber profiles are temporarily unavailable.' }, { status: 503 });
  }
}
