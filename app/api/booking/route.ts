import { NextResponse } from 'next/server';
import { ObjectId, type ClientSession } from 'mongodb';
import { auth } from '@/lib/auth';
import { getClient, getDb } from '@/lib/db/client';
import { ensureIndexes } from '@/lib/db/indexes';
import { bookingSchema } from '@/lib/validations/booking';
import { SALON_ID, addMinutes, bookingReference, toDhakaDateTime, getDhakaDate } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const db = await getDb();
    const [services, staff] = await Promise.all([
      db.collection('services').find({ salonId: SALON_ID, active: true }).project({ name: 1, description: 1, price: 1, durationMinutes: 1, category: 1 }).sort({ sortOrder: 1 }).toArray(),
      db.collection('staff').find({ salonId: SALON_ID, active: true }).project({ name: 1, title: 1, specialties: 1 }).sort({ name: 1 }).toArray(),
    ]);
    const date = searchParams.get('date');
    return NextResponse.json({ services, staff, date });
  } catch (error) {
    console.error('booking_catalog_failed', error);
    return NextResponse.json({ error: 'Booking is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`booking:${ip}`, 6, 60_000).allowed) return NextResponse.json({ error: 'Too many booking attempts. Please wait a moment.' }, { status: 429 });
  let session: ClientSession | undefined;
  try {
    const parsed = bookingSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid booking details.' }, { status: 400 });
    const input = parsed.data;
    const userSession = await auth();
    const accountEmail = userSession?.user?.email ? String(userSession.user.email).trim().toLowerCase() : '';
    const bookingEmail = accountEmail || String(input.email || '').trim().toLowerCase();
    if (input.date < getDhakaDate()) return NextResponse.json({ error: 'Please choose a future date.' }, { status: 400 });
    if (!ObjectId.isValid(input.serviceId)) return NextResponse.json({ error: 'Invalid service selection.' }, { status: 400 });
    const db = await getDb();
    await ensureIndexes();
    const service = await db.collection('services').findOne({ _id: new ObjectId(input.serviceId), salonId: SALON_ID, active: true });
    if (!service) return NextResponse.json({ error: 'Selected service is no longer available.' }, { status: 404 });
    const staffQuery: Record<string, unknown> = { salonId: SALON_ID, active: true };
    if (input.staffId && input.staffId !== 'any') {
      if (!ObjectId.isValid(input.staffId)) return NextResponse.json({ error: 'Invalid barber selection.' }, { status: 400 });
      staffQuery._id = new ObjectId(input.staffId);
    }
    const staff = await db.collection('staff').find(staffQuery).toArray();
    if (!staff.length) return NextResponse.json({ error: 'No barber is currently available. Please choose another.' }, { status: 409 });
    const settings = await db.collection('settings').findOne({ _id: 'salon' as never });
    const weekday = new Date(`${input.date}T06:00:00Z`).getUTCDay();
    const hours = settings?.openingHours?.[weekday] || { open: '10:00', close: '20:00', closed: false };
    if (hours.closed) return NextResponse.json({ error: 'The salon is closed on this day.' }, { status: 409 });
    const startAt = toDhakaDateTime(input.date, input.time);
    const endAt = addMinutes(startAt, Number(service.durationMinutes || 30));
    if (startAt <= new Date() || startAt < toDhakaDateTime(input.date, hours.open) || endAt > toDhakaDateTime(input.date, hours.close)) return NextResponse.json({ error: 'That time is outside the available booking hours.' }, { status: 400 });
    const client = await getClient();
    session = client.startSession();
    const bookingRef = bookingReference();
    let created: Record<string, unknown> | null = null;
    for (const barber of staff) {
      try {
        await session.withTransaction(async () => {
          const conflicting = await db.collection('appointments').findOne({ salonId: SALON_ID, staffId: barber._id, status: { $nin: ['CANCELLED', 'REJECTED'] }, startAt: { $lt: endAt }, endAt: { $gt: startAt } }, { session, projection: { _id: 1 } });
          if (conflicting) throw Object.assign(new Error('Selected barber is no longer available.'), { code: 'SLOT_BUSY' });
          const phone = input.phone.replace(/^\\+?88/, '0');
          const customer = await db.collection('customers').findOneAndUpdate(
            { phone },
            { $set: { name: input.customerName, email: bookingEmail, updatedAt: new Date() }, $setOnInsert: { salonId: SALON_ID, phone, createdAt: new Date() } },
            { upsert: true, returnDocument: 'after', session },
          );
          const barberSlots: string[] = [];
          for (let minute = Math.floor(startAt.getTime() / 900000) * 900000; minute < endAt.getTime(); minute += 900000) barberSlots.push(new Date(minute).toISOString());
          await db.collection('slotLocks').insertMany(barberSlots.map((slotKey) => ({ salonId: SALON_ID, staffId: barber._id, slotKey, appointmentRef: bookingRef, expiresAt: addMinutes(endAt, 24 * 60), createdAt: new Date() })), { session, ordered: true });
          const appointment = {
            salonId: SALON_ID, bookingRef, customerId: customer?._id, customerName: input.customerName, phone,
            email: bookingEmail, serviceId: service._id, serviceName: service.name, staffId: barber._id, staffName: barber.name, staffEmail: barber.email || '',
            price: Number(service.price), durationMinutes: Number(service.durationMinutes || 30), startAt, endAt,
            notes: input.notes, status: 'PENDING', paymentStatus: 'UNPAID', source: 'WEBSITE', createdAt: new Date(), updatedAt: new Date(),
          };
          const result = await db.collection('appointments').insertOne(appointment, { session });
          created = { ...appointment, _id: result.insertedId };
          await db.collection('notifications').insertOne({ salonId: SALON_ID, type: 'NEW_BOOKING', title: 'New appointment request', body: `${input.customerName} requested ${service.name}`, read: false, createdAt: new Date() }, { session });
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        if (created) break;
      } catch (error) {
        const duplicate = error as { code?: number | string; keyPattern?: Record<string, unknown> };
        const lockConflict = duplicate.code === 11000 && Boolean(duplicate.keyPattern?.staffId || duplicate.keyPattern?.slotKey);
        if (duplicate.code !== 'SLOT_BUSY' && !lockConflict) throw error;
      }
    }
    if (!created) return NextResponse.json({ error: 'That time was just booked. Please select another slot.' }, { status: 409 });
    return NextResponse.json({ success: true, bookingRef, status: 'PENDING', message: 'Your appointment request has been received.' }, { status: 201 });
  } catch (error) {
    console.error('booking_create_failed', error);
    return NextResponse.json({ error: 'We could not complete your booking. Please try again.' }, { status: 500 });
  } finally { await session?.endSession(); }
}
