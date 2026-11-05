import { BookingForm } from '@/components/booking-form';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { title: 'Book an Appointment | Multi-Salon' };

export default async function BookingPage() {
  const [session, db] = await Promise.all([auth(), getDb()]);
  const salons = await db.collection('salons').find({ status: 'ACTIVE' })
    .project({ salonId: 1, slug: 1, name: 1, address: 1 }).sort({ name: 1 }).limit(500).toArray();
  const publicSalons = salons.filter((salon) => typeof salon.slug === 'string' && salon.slug.length > 0)
    .map((salon) => ({ slug: String(salon.slug), name: String(salon.name || 'Salon'), address: String(salon.address || '') }));
  return (
    <main className="min-h-screen px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">ONLINE APPOINTMENTS · MULTI-SALON</p>
        <h1 className="serif mt-4 text-5xl md:text-6xl">Make time for <span className="gold italic">yourself.</span></h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-[#a5a098]">Choose a salon, explore its services and team, then reserve a time that works for you.</p>
        <div className="mt-12"><BookingForm salons={publicSalons} defaultName={session?.user?.name || ''} defaultEmail={session?.user?.email || ''} /></div>
      </div>
    </main>
  );
}
