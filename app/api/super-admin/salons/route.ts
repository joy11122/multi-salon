import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getClient, getDb } from '@/lib/db/client';

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

  const { salonId, status } = parsed.data;
  try {
    const db = await getDb();
    const salons = db.collection('salons');
    const locator = ObjectId.isValid(salonId)
      ? { $or: [{ salonId }, { _id: new ObjectId(salonId) }] }
      : { salonId };
    const client = await getClient();
    const mongoSession = client.startSession();
    let outcome: { status: string; unchanged?: boolean } | null = null;

    try {
      await mongoSession.withTransaction(async () => {
        const salon = await salons.findOne(locator, { session: mongoSession });
        if (!salon) throw new Error('SALON_NOT_FOUND');
        const previousStatus = String(salon.status || 'UNKNOWN');
        if (previousStatus === status) {
          outcome = { status: previousStatus, unchanged: true };
          return;
        }
        const statusFilter = salon.status === undefined
          ? { status: { $exists: false } }
          : { status: salon.status };
        const result = await salons.updateOne(
          { ...locator, ...statusFilter },
          { $set: { status, updatedAt: new Date(), statusUpdatedAt: new Date(), statusUpdatedBy: session.user.id } },
          { session: mongoSession },
        );
        if (result.modifiedCount !== 1) throw new Error('SALON_STATUS_CONFLICT');
        const now = new Date();
        await db.collection('platformAuditLogs').insertOne({
          action: status === 'SUSPENDED' ? 'SALON_SUSPENDED' : 'SALON_REACTIVATED',
          entityType: 'SALON',
          entityId: salonId,
          entityName: String(salon.name || salon.slug || salonId),
          previousStatus,
          newStatus: status,
          actorId: session.user.id,
          actorEmail: session.user.email || null,
          createdAt: now,
        }, { session: mongoSession });
        outcome = { status };
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } finally {
      await mongoSession.endSession();
    }

    if (!outcome) return NextResponse.json({ error: 'Could not confirm the salon update.' }, { status: 500 });
    return NextResponse.json({ success: true, ...outcome });
  } catch (error) {
    if (error instanceof Error && error.message === 'SALON_NOT_FOUND') return NextResponse.json({ error: 'Salon not found.' }, { status: 404 });
    if (error instanceof Error && error.message === 'SALON_STATUS_CONFLICT') return NextResponse.json({ error: 'Salon status changed concurrently. Refresh and try again.' }, { status: 409 });
    console.error('super_admin_salon_status_update_failed', error);
    return NextResponse.json({ error: 'Could not update salon status.' }, { status: 500 });
  }
}
