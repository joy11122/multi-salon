import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db/client';
import { SALON_ID, addMinutes, toDhakaDateTime, getDhakaDate } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';
import { findActiveSalonBySlug } from '@/lib/tenancy';

export async function GET(request: Request) {
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  if(!rateLimit(`availability:${ip}`,40,60_000).allowed)return NextResponse.json({error:'Too many availability requests. Please wait a moment.'},{status:429});
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '';
    const serviceId = searchParams.get('serviceId') || '';
    const staffId = searchParams.get('staffId') || 'any';
    const salonSlug = searchParams.get('salonSlug');
    let salonId = SALON_ID;
    if (salonSlug) {
      const salon = await findActiveSalonBySlug(salonSlug);
      if (!salon) return NextResponse.json({ error: 'Salon not found.' }, { status: 404 });
      salonId = String(salon.salonId);
    }
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date || !ObjectId.isValid(serviceId)) return NextResponse.json({ error: 'A valid date and service are required.' }, { status: 400 });
    if (date < getDhakaDate()) return NextResponse.json({ slots: [] });
    const db = await getDb();
    const service = await db.collection('services').findOne({ _id: new ObjectId(serviceId), salonId, active: true });
    if (!service) return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
    const staffFilter: Record<string, unknown> = { salonId, active: true };
    if (staffId !== 'any') { if (!ObjectId.isValid(staffId)) return NextResponse.json({ error: 'Invalid barber.' }, { status: 400 }); staffFilter._id = new ObjectId(staffId); }
    const staff = await db.collection('staff').find(staffFilter).toArray();
    const settings = salonId === SALON_ID
      ? await db.collection('settings').findOne({ _id: 'salon' as never })
      : await db.collection('salonSettings').findOne({ salonId });
    const hours = settings?.openingHours?.[new Date(`${date}T06:00:00Z`).getUTCDay()] || { open: '10:00', close: '20:00', closed: false };
    if (hours.closed) return NextResponse.json({ slots: [] });
    const start = toDhakaDateTime(date, hours.open);
    const close = toDhakaDateTime(date, hours.close);
    const now = new Date();
    const slots: { time: string; staffId: string; staffName: string }[] = [];
    for (const barber of staff) {
      for (let cursor = new Date(start); addMinutes(cursor, Number(service.durationMinutes || 30)) <= close; cursor = addMinutes(cursor, 30)) {
        if (cursor <= now) continue;
        const end = addMinutes(cursor, Number(service.durationMinutes || 30));
        const busy = await db.collection('appointments').findOne({ salonId, staffId: barber._id, status: { $nin: ['CANCELLED', 'REJECTED'] }, startAt: { $lt: end }, endAt: { $gt: cursor } }, { projection: { _id: 1 } });
        if (!busy) slots.push({ time: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(cursor), staffId: String(barber._id), staffName: barber.name });
      }
    }
    const unique = new Map<string, { time: string; staffId: string; staffName: string }>();
    for (const slot of slots) unique.set(`${slot.time}-${staffId === 'any' ? 'any' : slot.staffId}`, slot);
    return NextResponse.json({ slots: [...unique.values()] });
  } catch (error) {
    console.error('availability_failed', error);
    return NextResponse.json({ error: 'Could not load available times.' }, { status: 500 });
  }
}
