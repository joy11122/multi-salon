import Link from 'next/link';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Find a Salon | Multi-Salon' };

export default async function SalonDirectoryPage() {
  let salons: { salonId: string; slug: string; name: string; address?: string; phone?: string }[] = [];
  let unavailable = false;
  try {
    salons = await (await getDb()).collection('salons')
      .find({ status: 'ACTIVE' })
      .project({ salonId: 1, slug: 1, name: 1, address: 1, phone: 1 })
      .sort({ name: 1 })
      .limit(100)
      .toArray() as typeof salons;
  } catch (error) {
    console.error('salon_directory_load_failed', error);
    unavailable = true;
  }

  return (
    <main className="min-h-screen px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">DISCOVER LOCAL GROOMING</p>
        <h1 className="serif mt-4 text-5xl md:text-6xl">Find your salon.</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-[#999]">Explore independent salons and book directly with the team you choose.</p>
        {unavailable ? <p role="alert" className="mt-10 border border-red-500/30 p-5 text-sm text-red-200">The salon directory is temporarily unavailable.</p> : salons.length ? (
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {salons.map((salon) => (
              <article key={salon.salonId} className="border border-white/10 bg-[#151515] p-6">
                <p className="eyebrow">INDEPENDENT SALON</p>
                <h2 className="serif mt-3 text-2xl">{salon.name}</h2>
                {salon.address && <p className="mt-3 text-sm text-[#999]">{salon.address}</p>}
                <Link href={`/salons/${encodeURIComponent(salon.slug)}`} className="gold-button mt-6 inline-flex px-5 py-3 text-[10px] tracking-widest">VIEW SALON</Link>
              </article>
            ))}
          </div>
        ) : <p className="mt-10 border border-white/10 bg-[#151515] p-6 text-sm text-[#999]">No salons have published a profile yet.</p>}
      </div>
    </main>
  );
}
