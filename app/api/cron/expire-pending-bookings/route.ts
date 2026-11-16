import { NextResponse } from 'next/server';
import { expirePendingBookings } from '@/lib/booking-expiration';
import { captureOperationalError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const result = await expirePendingBookings({ limit: 500 });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    await captureOperationalError({
      error,
      route: '/api/cron/expire-pending-bookings',
      method: 'GET',
      severity: 'error',
    });
    return NextResponse.json({ error: 'Pending booking expiry failed.' }, { status: 500 });
  }
}
