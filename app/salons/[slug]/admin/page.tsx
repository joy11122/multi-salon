import Link from 'next/link';
import { getDb } from '@/lib/db/client';
import { money, toDhakaDateTime, getDhakaDate, addMinutes } from '@/lib/utils';
import { findActiveSalonBySlug } from '@/lib/tenancy';

export const dynamic = 'force-dynamic';

export default async function SalonAdminOverview({ params }: { params: { slug: string } }) {
  const salon = await findActiveSalonBySlug(params.slug);
  if (!salon) return null;
  const salonId = String(salon.salonId);
  const db = await getDb();
  const start = toDhakaDateTime(getDhakaDate(), '00:00');
  const end = addMinutes(start, 1440);
  const [today, pending, customers, services, staff, paid] = await Promise.all([
    db.collection('appointments').countDocuments({ salonId, startAt: { $gte: start, $lt: end } }),
    db.collection('appointments').countDocuments({ salonId, status: 'PENDING' }),
    db.collection('customers').countDocuments({ salonId }),
    db.collection('services').countDocuments({ salonId, active: true }),
    db.collection('staff').countDocuments({ salonId, active: true }),
    db.collection('payments').aggregate([{ $match: { salonId, status: 'PAID' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).toArray(),
  ]);
  const cards = [['Today’s appointments', today], ['Pending requests', pending], ['Customers', customers], ['Active services', services], ['Team members', staff], ['Recorded revenue', money(Number(paid[0]?.total || 0))]];

  return (
    <div>
      <p className="eyebrow">SALON OVERVIEW</p>
      <h2 className="serif mt-2 text-3xl">Good day.</h2>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => <div key={String(label)} className="border border-white/10 bg-[#151515] p-6"><p className="text-xs text-[#999]">{label}</p><p className="serif mt-3 text-3xl text-[#c6a15b]">{value}</p></div>)}
      </div>
      <div className="mt-8 border border-white/10 bg-[#151515] p-6">
        <p className="eyebrow">QUICK ACTIONS</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            ['Review bookings', 'appointments'],
            ['Manage services', 'services'],
            ['Manage team', 'staff'],
            ['Update opening hours', 'settings'],
          ].map(([label, section]) => <Link key={section} href={`/salons/${encodeURIComponent(params.slug)}/admin/${section}`} className="outline-gold px-4 py-3 text-xs">{label}</Link>)}
        </div>
      </div>
    </div>
  );
}
