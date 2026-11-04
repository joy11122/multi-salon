import { NextResponse } from 'next/server';
import { getClient, getDb } from '@/lib/db/client';
import type { ClientSession } from 'mongodb';
import { auth } from '@/lib/auth';

export async function POST(_request: Request, context: { params: { bookingRef: string } }) {
  const sessionUser = await auth();
  const email = String(sessionUser?.user?.email || '').trim().toLowerCase();
  if (!sessionUser?.user || !email) {
    return NextResponse.json({ error: 'Please sign in to cancel this booking.' }, { status: 401 });
  }

  const bookingRef = String(context.params.bookingRef || '').trim();
  if (!bookingRef || bookingRef.length > 64) {
    return NextResponse.json({ error: 'Invalid booking reference.' }, { status: 400 });
  }

  let mongoSession: ClientSession | undefined;
  try {
    const client = await getClient();
    const db = await getDb();
    mongoSession = client.startSession();
    let outcome: 'CANCELLED' | 'NOT_FOUND' | 'NOT_ALLOWED' = 'NOT_FOUND';

    await mongoSession.withTransaction(async () => {
      const now = new Date();
      const owned = await db.collection('appointments').findOne(
        { bookingRef, email },
        { session: mongoSession, projection: { _id: 1, salonId: 1, status: 1, startAt: 1 } },
      );

      if (!owned) {
        outcome = 'NOT_FOUND';
        return;
      }

      if (!['PENDING', 'CONFIRMED'].includes(String(owned.status)) || !(owned.startAt instanceof Date) || owned.startAt <= now) {
        outcome = 'NOT_ALLOWED';
        return;
      }

      const result = await db.collection('appointments').updateOne(
        { _id: owned._id, salonId: owned.salonId, bookingRef, email, status: { $in: ['PENDING', 'CONFIRMED'] }, startAt: { $gt: now } },
        { $set: { status: 'CANCELLED', updatedAt: now, cancelledAt: now, cancelledBy: 'CUSTOMER' } },
        { session: mongoSession },
      );

      if (!result.matchedCount) {
        outcome = 'NOT_ALLOWED';
        return;
      }

      await db.collection('slotLocks').deleteMany(
        { salonId: owned.salonId, appointmentRef: bookingRef },
        { session: mongoSession },
      );
      await db.collection('auditLogs').insertOne({
        salonId: owned.salonId,
        actorId: sessionUser.user.id || email,
        action: 'CUSTOMER_CANCEL',
        resource: 'appointments',
        resourceId: bookingRef,
        changes: { status: 'CANCELLED' },
        createdAt: now,
      }, { session: mongoSession });
      outcome = 'CANCELLED';
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });

    if (outcome === 'NOT_FOUND') return NextResponse.json({ error: 'Booking not found in your account.' }, { status: 404 });
    if (outcome === 'NOT_ALLOWED') return NextResponse.json({ error: 'This booking can no longer be cancelled. Only future pending or confirmed appointments can be cancelled.' }, { status: 409 });
    return NextResponse.json({ success: true, message: 'Your appointment has been cancelled.' });
  } catch (error) {
    console.error('customer_booking_cancel_failed', error);
    return NextResponse.json({ error: 'We could not cancel this booking. Please try again.' }, { status: 500 });
  } finally {
    await mongoSession?.endSession();
  }
}
