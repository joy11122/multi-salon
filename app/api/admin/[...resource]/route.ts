import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db/client';
import { requireRole } from '@/lib/auth-guards';
import { SALON_ID } from '@/lib/utils';

const resources = new Set(['appointments', 'services', 'staff', 'customers', 'payments', 'reviews', 'offers', 'notifications', 'settings']);
const collectionFor = (resource: string) => resource === 'settings' ? 'settings' : resource;

async function syncAppointmentPayment(db: Awaited<ReturnType<typeof getDb>>, appointmentId: ObjectId) {
  const appointment = await db.collection('appointments').findOne({ _id: appointmentId, salonId: SALON_ID }, { projection: { price: 1 } });
  if (!appointment) return;
  const paid = await db.collection('payments').aggregate([{ $match: { salonId: SALON_ID, appointmentId, status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).toArray();
  const total = Number(paid[0]?.total || 0);
  const paymentStatus = total >= Number(appointment.price) ? 'PAID' : total > 0 ? 'PARTIAL' : 'UNPAID';
  await db.collection('appointments').updateOne({ _id: appointmentId, salonId: SALON_ID }, { $set: { paymentStatus, updatedAt: new Date() } });
}

export async function GET(request: Request, context: { params: { resource: string[] } }) {
  const guard = await requireRole(['ADMIN', 'STAFF']);
  if ('response' in guard) return guard.response;
  const resource = context.params.resource?.[0] || '';
  if (context.params.resource?.length !== 1) return NextResponse.json({ error: 'Unknown resource.' }, { status: 404 });
  if (!resources.has(resource)) return NextResponse.json({ error: 'Unknown resource.' }, { status: 404 });
  if (guard.session.user.role === 'STAFF' && resource !== 'appointments') return NextResponse.json({ error: 'You do not have permission to view this resource.' }, { status: 403 });
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    if (resource === 'settings') {
      const settings = await db.collection('settings').findOne({ _id: 'salon' as never });
      return NextResponse.json({ items: settings ? [settings] : [] });
    }
    const filter: Record<string, unknown> = { salonId: SALON_ID };
    if (resource === 'appointments' && searchParams.get('status')) filter.status = searchParams.get('status');
    if (resource === 'appointments' && searchParams.get('date')) { const date = searchParams.get('date') || ''; const parsed = new Date(`${date}T00:00:00Z`); if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date) return NextResponse.json({ error: 'Invalid appointment date.' }, { status: 400 }); const start = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), -6)); filter.startAt = { $gte: start, $lt: new Date(start.getTime()+86_400_000) }; }
    if (resource === 'appointments' && guard.session.user.role === 'STAFF') filter.staffEmail = String(guard.session.user.email || '').toLowerCase();
    const items = await db.collection(collectionFor(resource)).find(filter).sort({ createdAt: -1 }).limit(250).toArray();
    return NextResponse.json({ items: items.map((item) => ({ ...item, _id: String(item._id) })) });
  } catch (error) {
    console.error('admin_list_failed', { resource, error });
    return NextResponse.json({ error: 'Could not load records.' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: { resource: string[] } }) {
  const guard = await requireRole(['ADMIN']);
  if ('response' in guard) return guard.response;
  const resource = context.params.resource?.[0] || '';
  if (context.params.resource?.length !== 1) return NextResponse.json({ error: 'Unknown resource.' }, { status: 404 });
  if (!resources.has(resource) || resource === 'appointments' || resource === 'customers' || resource === 'notifications' || resource === 'settings') return NextResponse.json({ error: 'This resource cannot be created here.' }, { status: 404 });
  try {
    const input = await request.json() as Record<string, unknown>;
    const allowed = resource === 'services' ? ['name','description','category','price','durationMinutes','active','sortOrder']
      : resource === 'staff' ? ['name','email','phone','title','bio','specialties','active','commissionRate']
      : resource === 'payments' ? ['appointmentId','amount','method','status','reference']
      : resource === 'reviews' ? ['customerName','rating','comment','published']
      : ['title','description','discountType','discountValue','startAt','endAt','active','code'];
    const doc: Record<string, unknown> = { salonId: SALON_ID, createdAt: new Date(), updatedAt: new Date() };
    for (const key of allowed) if (input[key] !== undefined) doc[key] = input[key];
    if (resource === 'services' && (typeof doc.name !== 'string' || !Number.isInteger(Number(doc.price)) || Number(doc.price) < 0 || !Number.isInteger(Number(doc.durationMinutes)) || Number(doc.durationMinutes) < 10)) return NextResponse.json({ error: 'Service name, price and duration are required.' }, { status: 400 });
    if (resource === 'services') { doc.price = Number(doc.price); doc.durationMinutes = Number(doc.durationMinutes); }
    if (resource === 'staff' && typeof doc.email === 'string') doc.email = doc.email.toLowerCase();
    if (resource === 'payments' && (!ObjectId.isValid(String(doc.appointmentId || '')) || !Number.isInteger(Number(doc.amount)) || Number(doc.amount) <= 0 || !['CASH','CARD','MOBILE_BANKING','BANK_TRANSFER'].includes(String(doc.method)))) return NextResponse.json({ error: 'Enter a valid amount and payment method.' }, { status: 400 });
    if (resource === 'staff' && (typeof doc.name !== 'string' || typeof doc.phone !== 'string' || typeof doc.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.email))) return NextResponse.json({ error: 'Staff name, valid email and phone are required.' }, { status: 400 });
    if (resource === 'reviews' && (!Number.isInteger(Number(doc.rating)) || Number(doc.rating) < 1 || Number(doc.rating) > 5 || typeof doc.customerName !== 'string' || typeof doc.comment !== 'string')) return NextResponse.json({ error: 'Review name, comment and a rating from 1 to 5 are required.' }, { status: 400 });
    if (resource === 'reviews') doc.rating = Number(doc.rating);
    if (resource === 'offers' && (typeof doc.title !== 'string' || !Number.isInteger(Number(doc.discountValue)) || Number(doc.discountValue) <= 0 || !['PERCENT','FIXED'].includes(String(doc.discountType)))) return NextResponse.json({ error: 'Offer title, discount type and positive discount value are required.' }, { status: 400 });
    if (resource === 'offers' && doc.discountType === 'PERCENT' && Number(doc.discountValue) > 100) return NextResponse.json({ error: 'Percentage discount cannot exceed 100.' }, { status: 400 });
    if (resource === 'offers') doc.discountValue = Number(doc.discountValue);
    const db = await getDb();
    if (resource === 'payments') {
      const appointment = await db.collection('appointments').findOne({ _id: new ObjectId(String(doc.appointmentId)), salonId: SALON_ID }, { projection: { price: 1 } });
      if (!appointment) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
      const paid = await db.collection('payments').aggregate([{ $match: { salonId: SALON_ID, appointmentId: new ObjectId(String(doc.appointmentId)), status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).toArray();
      if (Number(doc.amount) + Number(paid[0]?.total || 0) > Number(appointment.price)) return NextResponse.json({ error: 'Payment exceeds the remaining balance.' }, { status: 400 });
      if (doc.status && !['PENDING','PAID','FAILED','REFUNDED'].includes(String(doc.status))) return NextResponse.json({ error: 'Invalid payment status.' }, { status: 400 });
      doc.amount = Number(doc.amount);
      doc.appointmentId = new ObjectId(String(doc.appointmentId));
      if (!doc.status) doc.status = 'PENDING';
    }
    const result = await db.collection(resource).insertOne(doc);
    if (resource === 'payments') await syncAppointmentPayment(db, doc.appointmentId as ObjectId);
    if (resource === 'staff') await db.collection('users').updateOne({ email: String(doc.email).toLowerCase() }, { $set: { name: doc.name, role: 'STAFF', updatedAt: new Date() }, $setOnInsert: { email: String(doc.email).toLowerCase(), emailVerified: null, createdAt: new Date() } }, { upsert: true });
    return NextResponse.json({ success: true, id: String(result.insertedId) }, { status: 201 });
  } catch (error) {
    console.error('admin_create_failed', { resource, error });
    return NextResponse.json({ error: 'Could not create this record.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: { resource: string[] } }) {
  const guard = await requireRole(['ADMIN', 'STAFF']);
  if ('response' in guard) return guard.response;
  const resource = context.params.resource?.[0] || '';
  if (context.params.resource?.length !== 1) return NextResponse.json({ error: 'Unknown resource.' }, { status: 404 });
  if (!resources.has(resource)) return NextResponse.json({ error: 'Unknown resource.' }, { status: 404 });
  try {
    const input = await request.json() as Record<string, unknown>;
    const id = String(input.id || '');
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid record ID.' }, { status: 400 });
    const allowed = resource === 'appointments' ? ['status']
      : resource === 'services' ? ['name','description','category','price','durationMinutes','active','sortOrder']
      : resource === 'staff' ? ['name','email','phone','title','bio','specialties','active','commissionRate']
      : resource === 'reviews' ? ['customerName','rating','comment','published']
      : resource === 'offers' ? ['title','description','code','active','discountType','discountValue','endAt']
      : resource === 'payments' ? ['status','method','reference']
      : resource === 'notifications' ? ['read'] : [];
    if (!allowed.length || (guard.session.user.role === 'STAFF' && resource !== 'appointments')) return NextResponse.json({ error: 'This update is not allowed.' }, { status: 403 });
    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) if (input[key] !== undefined) update[key] = input[key];
    if (resource === 'payments' && update.status === 'PAID') {
      const db = await getDb();
      const payment = await db.collection('payments').findOne({ _id: new ObjectId(id), salonId: SALON_ID });
      if (!payment || !(payment.appointmentId instanceof ObjectId)) return NextResponse.json({ error: 'Payment record is invalid.' }, { status: 400 });
      const appointment = await db.collection('appointments').findOne({ _id: payment.appointmentId, salonId: SALON_ID }, { projection: { price: 1 } });
      const alreadyPaid = await db.collection('payments').aggregate([{ $match: { salonId: SALON_ID, appointmentId: payment.appointmentId, status: 'PAID', _id: { $ne: payment._id } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).toArray();
      if (!appointment || Number(alreadyPaid[0]?.total || 0) + Number(payment.amount) > Number(appointment.price)) return NextResponse.json({ error: 'Marking this payment paid would exceed the appointment balance.' }, { status: 400 });
    }
    if (resource === 'reviews' && update.rating !== undefined && (!Number.isInteger(Number(update.rating)) || Number(update.rating) < 1 || Number(update.rating) > 5)) return NextResponse.json({ error: 'Review rating must be between 1 and 5.' }, { status: 400 });
    if (resource === 'offers' && update.discountType === 'PERCENT' && Number(update.discountValue) > 100) return NextResponse.json({ error: 'Percentage discount cannot exceed 100.' }, { status: 400 });
    if (resource === 'services' && ((update.price !== undefined && (!Number.isInteger(Number(update.price)) || Number(update.price) < 0)) || (update.durationMinutes !== undefined && (!Number.isInteger(Number(update.durationMinutes)) || Number(update.durationMinutes) < 10)))) return NextResponse.json({ error: 'Service price and duration must be valid whole numbers.' }, { status: 400 });
    if (resource === 'staff' && update.email !== undefined) { if (typeof update.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(update.email)) return NextResponse.json({ error: 'Enter a valid staff email.' }, { status: 400 }); update.email = update.email.toLowerCase(); }
    if (resource === 'services') { if (update.price !== undefined) update.price = Number(update.price); if (update.durationMinutes !== undefined) update.durationMinutes = Number(update.durationMinutes); }
    if (resource === 'reviews' && update.rating !== undefined) update.rating = Number(update.rating);
    if (resource === 'offers' && update.discountValue !== undefined) update.discountValue = Number(update.discountValue);
    if (resource === 'offers' && update.discountValue !== undefined && (!Number.isInteger(Number(update.discountValue)) || Number(update.discountValue) <= 0)) return NextResponse.json({ error: 'Discount value must be a positive whole number.' }, { status: 400 });
    if (resource === 'offers' && update.discountType !== undefined && !['PERCENT','FIXED'].includes(String(update.discountType))) return NextResponse.json({ error: 'Invalid discount type.' }, { status: 400 });
    if (resource === 'notifications' && typeof update.read !== 'boolean') return NextResponse.json({ error: 'Notification read state must be boolean.' }, { status: 400 });
    if (resource === 'payments' && update.method && !['CASH','CARD','MOBILE_BANKING','BANK_TRANSFER'].includes(String(update.method))) return NextResponse.json({ error: 'Invalid payment method.' }, { status: 400 });
    if (resource === 'payments' && update.status && !['PENDING','PAID','FAILED','REFUNDED'].includes(String(update.status))) return NextResponse.json({ error: 'Invalid payment status.' }, { status: 400 });
    if (resource === 'appointments' && update.status && !['PENDING','CONFIRMED','COMPLETED','CANCELLED','REJECTED','NO_SHOW'].includes(String(update.status))) return NextResponse.json({ error: 'Invalid appointment status.' }, { status: 400 });
    const filter: Record<string, unknown> = { _id: new ObjectId(id), salonId: SALON_ID };
    if (guard.session.user.role === 'STAFF') filter.staffEmail = String(guard.session.user.email || '').toLowerCase();
    let previousAppointment: Record<string, unknown> | null = null;
    if (resource === 'appointments') {
      previousAppointment = await (await getDb()).collection('appointments').findOne(filter) as Record<string, unknown> | null;
      if (!previousAppointment) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
      if (update.status) {
        const transitions: Record<string, string[]> = { PENDING: ['CONFIRMED','CANCELLED','REJECTED'], CONFIRMED: ['COMPLETED','CANCELLED','NO_SHOW'] };
        if (!transitions[String(previousAppointment.status)]?.includes(String(update.status))) return NextResponse.json({ error: 'This appointment status transition is not allowed.' }, { status: 409 });
      }
    }
    if (guard.session.user.role === 'STAFF' && update.status && !['CONFIRMED','COMPLETED','NO_SHOW'].includes(String(update.status))) return NextResponse.json({ error: 'You cannot set that appointment status.' }, { status: 403 });
    const db = await getDb();
    const previousStaff = resource === 'staff' && update.email !== undefined ? await db.collection('staff').findOne(filter, { projection: { email: 1 } }) : null;
    const result = await db.collection(resource).updateOne(filter, { $set: update });
    if (!result.matchedCount) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    if (resource === 'staff' && update.email !== undefined) { const staffRecord = await db.collection('staff').findOne(filter, { projection: { name: 1, email: 1 } }); if (previousStaff?.email && previousStaff.email !== update.email) await db.collection('users').updateOne({ email: previousStaff.email }, { $set: { role: 'CUSTOMER', updatedAt: new Date() } }); await db.collection('users').updateOne({ email: String(update.email) }, { $set: { name: staffRecord?.name, role: 'STAFF', updatedAt: new Date() }, $setOnInsert: { email: String(update.email), emailVerified: null, createdAt: new Date() } }, { upsert: true }); }
    if (resource === 'appointments' && ['CANCELLED','REJECTED'].includes(String(update.status))) await (await getDb()).collection('slotLocks').deleteMany({ salonId: SALON_ID, appointmentRef: String((await (await getDb()).collection('appointments').findOne({ _id: new ObjectId(id), salonId: SALON_ID }, { projection: { bookingRef: 1 } }))?.bookingRef || '') });
    if (resource === 'payments') { const db = await getDb(); const payment = await db.collection('payments').findOne({ _id: new ObjectId(id), salonId: SALON_ID }); if (payment?.appointmentId instanceof ObjectId) await syncAppointmentPayment(db, payment.appointmentId); }
    await (await getDb()).collection('auditLogs').insertOne({ salonId: SALON_ID, actorId: guard.session.user.id, action: 'UPDATE', resource, resourceId: id, changes: update, createdAt: new Date() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('admin_update_failed', { resource, error });
    return NextResponse.json({ error: 'Could not update this record.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: { resource: string[] } }) {
  const guard = await requireRole(['ADMIN']);
  if ('response' in guard) return guard.response;
  const resource = context.params.resource?.[0] || '';
  if (context.params.resource?.length !== 1) return NextResponse.json({ error: 'Unknown resource.' }, { status: 404 });
  if (!['services','staff','offers','reviews'].includes(resource)) return NextResponse.json({ error: 'This resource cannot be deleted.' }, { status: 403 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid record ID.' }, { status: 400 });
    const result = await (await getDb()).collection(resource).updateOne({ _id: new ObjectId(id), salonId: SALON_ID }, { $set: { active: false, published: false, deletedAt: new Date(), updatedAt: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    if (resource === 'staff') { const staff = await (await getDb()).collection('staff').findOne({ _id: new ObjectId(id), salonId: SALON_ID }); if (staff?.email) await (await getDb()).collection('users').updateOne({ email: staff.email }, { $set: { role: 'CUSTOMER', updatedAt: new Date() } }); }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('admin_delete_failed', { resource, error });
    return NextResponse.json({ error: 'Could not archive this record.' }, { status: 500 });
  }
}
