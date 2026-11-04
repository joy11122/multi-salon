import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { BookingForm } from '@/components/booking-form';
import { findActiveSalonBySlug } from '@/lib/tenancy';

export const dynamic = 'force-dynamic';

export default async function SalonBookingPage({ params }: { params: { slug: string } }) {
  const salon = await findActiveSalonBySlug(params.slug);
  if (!salon) notFound();
  const session = await auth();

  return (
    <main className="min-h-screen px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">RESERVE YOUR CHAIR · {String(salon.name).toUpperCase()}</p>
        <h1 className="serif mt-4 text-5xl md:text-6xl">Make time for <span className="gold italic">yourself.</span></h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-[#a5a098]">Choose a service, a team member and a time at {String(salon.name)}.</p>
        <div className="mt-12"><BookingForm salonSlug={params.slug} defaultName={session?.user?.name || ''} defaultEmail={session?.user?.email || ''}/></div>
      </div>
    </main>
  );
}
