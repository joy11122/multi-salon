import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = await getDb();
    const salons = await db.collection('salons')
      .find({ status: 'ACTIVE' })
      .project({ salonId: 1, slug: 1, name: 1, address: 1, phone: 1 })
      .sort({ name: 1 })
      .limit(500)
      .toArray();

    if (!salons.length) {
      return NextResponse.json({ items: [], salons: [] }, {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      });
    }

    const salonIds = salons.map((salon) => String(salon.salonId));
    const services = await db.collection('services')
      .find({ salonId: { $in: salonIds }, active: true })
      .project({ salonId: 1, name: 1, description: 1, category: 1, price: 1, durationMinutes: 1, sortOrder: 1 })
      .sort({ sortOrder: 1, name: 1 })
      .limit(2000)
      .toArray();

    const salonById = new Map(salons.map((salon) => [String(salon.salonId), salon]));
    const items = services.flatMap((service) => {
      const salon = salonById.get(String(service.salonId));
      if (!salon || typeof salon.slug !== 'string') return [];
      return [{
        id: String(service._id),
        name: String(service.name || 'Service'),
        description: String(service.description || ''),
        category: String(service.category || 'Other services'),
        price: Number(service.price || 0),
        durationMinutes: Number(service.durationMinutes || 30),
        salon: {
          name: String(salon.name || 'Salon'),
          slug: salon.slug,
          address: String(salon.address || ''),
        },
      }];
    });

    return NextResponse.json({
      items,
      salons: salons
        .filter((salon) => typeof salon.slug === 'string')
        .map((salon) => ({ name: String(salon.name || 'Salon'), slug: salon.slug })),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('public_services_catalog_failed', error);
    return NextResponse.json({ error: 'Services are temporarily unavailable.' }, { status: 503 });
  }
}
