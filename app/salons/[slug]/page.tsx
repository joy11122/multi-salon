import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db/client';
import { findActiveSalonBySlug } from '@/lib/tenancy';
import { money } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2200&q=85';

function getSalonHeroImage(salon: unknown) {
  if (!salon || typeof salon !== 'object') return DEFAULT_HERO_IMAGE;
  const record = salon as Record<string, unknown>;
  const candidates = [record.coverImage, record.bannerImage, record.heroImage];
  const image = candidates.find(
    (candidate): candidate is string =>
      typeof candidate === 'string' && candidate.startsWith('https://'),
  );
  return image || DEFAULT_HERO_IMAGE;
}

export default async function PublicSalonPage({ params }: { params: { slug: string } }) {
  const salon = await findActiveSalonBySlug(params.slug);
  if (!salon) notFound();

  const salonId = String(salon.salonId);
  const services = await (await getDb()).collection('services')
    .find({ salonId, active: true })
    .project({ name: 1, description: 1, price: 1, durationMinutes: 1, category: 1, imageUrl: 1 })
    .sort({ sortOrder: 1, name: 1 })
    .limit(100)
    .toArray();

  const salonName = String(salon.name || 'Your salon');
  const heroImage = getSalonHeroImage(salon);
  const address = typeof salon.address === 'string' ? salon.address : '';
  const phone = typeof salon.phone === 'string' ? salon.phone : '';
  const bookingHref = '/salons/' + encodeURIComponent(params.slug) + '/booking';
  const phoneHref = 'tel:' + phone.replace(/[^+\d]/g, '');

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-[#f5f1e8]">
      <section className="relative isolate min-h-[540px] overflow-hidden border-b border-[#c6a15b]/20 bg-[#0b0b0b] md:min-h-[640px]">
        <Image src={heroImage} alt={salonName + ' salon interior'} fill priority unoptimized sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 z-0 bg-[linear-gradient(90deg,rgba(8,8,8,0.97)_0%,rgba(8,8,8,0.88)_38%,rgba(8,8,8,0.48)_70%,rgba(8,8,8,0.2)_100%)]" />
        <div className="absolute inset-0 z-0 bg-[linear-gradient(0deg,rgba(8,8,8,0.72),transparent_48%)]" />
        <div className="relative z-10 mx-auto flex min-h-[540px] max-w-7xl items-center px-5 py-20 md:min-h-[640px] md:px-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 border border-[#c6a15b]/40 bg-black/35 px-4 py-2 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c6a15b]" />
              <p className="eyebrow">INDEPENDENT SALON · {address || 'WELCOME IN'}</p>
            </div>
            <h1 className="serif mt-7 max-w-2xl text-5xl leading-[1.04] tracking-tight text-[#f5f1e8] sm:text-6xl md:text-7xl">{salonName}</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#e0d8c8] md:text-lg">
              A more considered grooming experience. Thoughtful service, attention to detail, and time set aside just for you.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href={bookingHref} className="gold-button inline-flex min-h-14 items-center justify-center px-8 text-[10px] font-semibold tracking-[0.22em]">BOOK AN APPOINTMENT</Link>
              <Link href="#services" className="outline-gold inline-flex min-h-14 items-center justify-center px-7 text-[10px] tracking-[0.2em] text-[#f5f1e8]">EXPLORE SERVICES</Link>
            </div>
            {(address || phone) && (
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-6 text-xs tracking-wide text-[#d0c7b8]">
                {address && <span>{address}</span>}
                {phone && <a href={phoneHref} className="transition-colors hover:text-[#c6a15b]">{phone}</a>}
              </div>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-8 right-8 hidden text-right md:block">
          <p className="eyebrow text-white/70">THE ART OF</p>
          <p className="serif mt-1 text-2xl italic text-[#c6a15b]">looking sharp.</p>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-24">
        <div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">THE SERVICE MENU</p>
            <h2 className="serif mt-3 text-4xl md:text-5xl">Choose your experience.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#a5a098]">Explore the services currently offered by {salonName}.</p>
          </div>
          <Link href={bookingHref} className="outline-gold inline-flex min-h-12 items-center justify-center px-6 text-[10px] tracking-[0.18em]">RESERVE YOUR VISIT</Link>
        </div>

        {services.length ? (
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {services.map((service) => (
              <article key={String(service._id)} className="group overflow-hidden border border-white/10 bg-[#151515] transition-colors duration-300 hover:border-[#c6a15b]/50">
                {typeof service.imageUrl === 'string' && service.imageUrl.startsWith('https://res.cloudinary.com/') ? (
                  <Image src={service.imageUrl} alt={String(service.name)} width={1200} height={675} unoptimized className="aspect-[16/8] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                ) : (
                  <div className="relative flex aspect-[16/8] items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(198,161,91,0.15),transparent_65%),linear-gradient(135deg,#24211b,#111)]">
                    <span className="serif text-5xl text-[#c6a15b]/35">{String(service.name).slice(0, 1).toUpperCase()}</span>
                    <span className="absolute bottom-5 left-6 eyebrow text-white/60">SIGNATURE SERVICE</span>
                  </div>
                )}
                <div className="p-6 md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {typeof service.category === 'string' && service.category.trim() && <p className="eyebrow mb-2">{service.category}</p>}
                      <h3 className="serif text-2xl text-[#f5f1e8]">{String(service.name)}</h3>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-[#c6a15b]">{money(Number(service.price || 0))}</span>
                  </div>
                  {typeof service.description === 'string' && service.description && <p className="mt-3 text-sm leading-7 text-[#a5a098]">{service.description}</p>}
                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-xs tracking-wide text-[#8d877e]">{Number(service.durationMinutes || 30)} minutes</span>
                    <Link href={bookingHref} className="text-[10px] font-semibold tracking-[0.18em] text-[#c6a15b] transition-colors hover:text-[#e0c58d]">BOOK THIS SERVICE →</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-9 border border-white/10 bg-[#151515] px-6 py-10 text-center">
            <p className="serif text-2xl">Our service menu is being prepared.</p>
            <p className="mt-3 text-sm text-[#a5a098]">Please check back soon or contact the salon directly.</p>
            {phone && <a href={phoneHref} className="gold-button mt-6 inline-flex px-6 py-3 text-xs tracking-widest">CALL THE SALON</a>}
          </div>
        )}
      </section>

      <section className="border-y border-[#c6a15b]/15 bg-[#151515]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-12 md:flex-row md:items-center md:px-10">
          <div>
            <p className="eyebrow">MAKE TIME FOR YOURSELF</p>
            <h2 className="serif mt-2 text-3xl">Your chair is waiting.</h2>
          </div>
          <Link href={bookingHref} className="gold-button inline-flex min-h-14 items-center px-8 text-[10px] font-semibold tracking-[0.22em]">BOOK YOUR VISIT</Link>
        </div>
      </section>
    </main>
  );
}
