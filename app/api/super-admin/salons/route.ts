import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const updateSchema = z.object({
  salonId: z.string().trim().min(1).max(100),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
}).strict();

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid salon update.' }, { status: 400 });

  try {
    const db = await getDb();
    const salons = db.collection('salons');
    const salon = await salons.findOne({ salonId: parsed.data.salonId });
    if (!salon) return NextResponse.json({ error: 'Salon not found.' }, { status: 404 });
    const previousStatus = String(salon.status || 'UNKNOWN');
    if (previousStatus === parsed.data.status) return NextResponse.json({ success: true, status: previousStatus, unchanged: true });

    const now = new Date();
    const result = await salons.updateOne(
      { salonId: parsed.data.salonId, status: salon.status },
      { $set: { status: parsed.data.status, updatedAt: now, statusUpdatedAt: now, statusUpdatedBy: session.user.id } },
    );
    if (result.modifiedCount !== 1) return NextResponse.json({ error: 'Salon status changed concurrently. Refresh and try again.' }, { status: 409 });

    await db.collection('platformAuditLogs').insertOne({
      action: parsed.data.status === 'SUSPENDED' ? 'SALON_SUSPENDED' : 'SALON_REACTIVATED',
      entityType: 'SALON',
      entityId: parsed.data.salonId,
      entityName: String(salon.name || salon.slug || parsed.data.salonId),
      previousStatus,
      newStatus: parsed.data.status,
      actorId: session.user.id,
      actorEmail: session.user.email || null,
      createdAt: now,
    });
    return NextResponse.json({ success: true, status: parsed.data.status });
  } catch (error) {
    console.error('super_admin_salon_status_update_failed', error);
    return NextResponse.json({ error: 'Could not update salon status.' }, { status: 500 });
  }
}
