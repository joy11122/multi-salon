import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db/client';
import { findActiveSalonBySlug } from '@/lib/tenancy';
import { money } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PublicSalonPage({ params }: { params: { slug: string } }) {
  const salon = await findActiveSalonBySlug(params.slug);
  if (!salon) notFound();

  const salonId = String(salon.salonId);
  const services = await (await getDb()).collection('services')
    .find({ salonId, active: true })
    .project({ name: 1, description: 1, price: 1, durationMinutes: 1, category: 1 })
    .sort({ sortOrder: 1, name: 1 })
    .limit(100)
    .toArray();

  return (
    <main className="min-h-screen">
      <section className="border-b border-white/10 bg-[#151515] px-5 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">INDEPENDENT SALON</p>
          <h1 className="serif mt-4 text-5xl md:text-7xl">{String(salon.name)}</h1>
          {salon.address && <p className="mt-5 text-sm text-[#aaa]">{String(salon.address)}</p>}
          {salon.phone && <p className="mt-2 text-sm text-[#aaa]">{String(salon.phone)}</p>}
          <Link href={`/salons/${encodeURIComponent(params.slug)}/booking`} className="gold-button mt-9 inline-flex px-7 py-4 text-[10px] tracking-widest">BOOK AN APPOINTMENT</Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-10">
        <p className="eyebrow">THE SERVICE MENU</p>
        <h2 className="serif mt-3 text-3xl">Choose your experience.</h2>
        {services.length ? <div className="mt-8 grid gap-4 md:grid-cols-2">
          {services.map((service) => <article key={String(service._id)} className="border border-white/10 bg-[#151515] p-6">
            <div className="flex items-start justify-between gap-4"><h3 className="serif text-xl">{String(service.name)}</h3><span className="text-sm text-[#c6a15b]">{money(Number(service.price || 0))}</span></div>
            <p className="mt-3 text-sm leading-7 text-[#999]">{String(service.description || '')}</p>
            <p className="mt-4 text-xs text-[#777]">{Number(service.durationMinutes || 30)} minutes</p>
          </article>)}
        </div> : <p className="mt-6 border border-white/10 p-5 text-sm text-[#999]">This salon has not published its services yet.</p>}
      </section>
    </main>
  );
}
