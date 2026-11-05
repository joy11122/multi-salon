'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, MapPin, Search, Scissors, Store, UserRound } from 'lucide-react';

type SalonOption = { name: string; slug: string };
type Barber = {
  id: string;
  name: string;
  title: string;
  bio: string;
  specialties: string[];
  imageUrl: string;
  salon: { name: string; slug: string; address: string };
};

export function BarbersDirectory() {
  const [items, setItems] = useState<Barber[]>([]);
  const [salons, setSalons] = useState<SalonOption[]>([]);
  const [search, setSearch] = useState('');
  const [salonFilter, setSalonFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/barbers', { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load barber profiles.');
        setItems(Array.isArray(data.items) ? data.items : []);
        setSalons(Array.isArray(data.salons) ? data.salons : []);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load barber profiles.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return items.filter((person) => {
      const matchesSalon = salonFilter === 'all' || person.salon.slug === salonFilter;
      const haystack = [person.name, person.title, person.bio, person.salon.name, person.salon.address, ...person.specialties].join(' ').toLocaleLowerCase();
      return matchesSalon && (!query || haystack.includes(query));
    });
  }, [items, search, salonFilter]);

  return (
    <main className="barbers-page min-h-screen px-4 pb-20 pt-10 sm:px-6 lg:px-10 lg:pt-14">
      <div className="mx-auto max-w-7xl">
        <header className="barbers-heading relative overflow-hidden rounded-[2rem] border border-white/[.07] px-6 py-11 sm:px-10 sm:py-14">
          <div className="barbers-heading-glow" />
          <div className="relative z-10 max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.24em] text-[#c6a15b]"><span className="h-px w-8 bg-[#c6a15b]" /> Meet the professionals</p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-.04em] text-white sm:text-5xl lg:text-6xl">Skilled hands.<br /><span className="barbers-gradient-text">Personal style.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#d8d2c7] sm:text-base">Meet the barbers and grooming professionals from salons across our community. Find your expert and book directly.</p>
          </div>
          <div className="pointer-events-none absolute -bottom-20 right-[-2rem] hidden h-80 w-80 rounded-full border border-[#c6a15b]/10 lg:block" />
          <div className="pointer-events-none absolute right-24 top-12 hidden text-[#c6a15b]/10 lg:block"><Scissors size={150} strokeWidth={.7} /></div>
        </header>

        <section aria-label="Find a barber" className="barbers-filter mt-7 grid gap-3 rounded-2xl border border-white/[.08] p-3 sm:p-4 md:grid-cols-[minmax(220px,1fr)_minmax(200px,.65fr)]">
          <label className="relative block"><span className="sr-only">Search barbers or specialties</span><Search size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a5a098]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, skill or salon…" className="w-full rounded-xl border border-white/[.08] bg-[#0b0b0b] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-[#77736b] focus:border-[#c6a15b]/60 focus:ring-2 focus:ring-[#c6a15b]/10" /></label>
          <label className="relative block"><span className="sr-only">Filter by salon</span><Store size={17} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a5a098]" /><select value={salonFilter} onChange={(event) => setSalonFilter(event.target.value)} className="w-full appearance-none rounded-xl border border-white/[.08] bg-[#0b0b0b] px-4 py-3.5 pl-11 text-sm text-[#d8d2c7] outline-none transition focus:border-[#c6a15b]/60"><option value="all">All salons</option>{salons.map((salon) => <option key={salon.slug} value={salon.slug}>{salon.name}</option>)}</select></label>
        </section>

        <div className="mt-9 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.22em] text-[#c6a15b]">The people behind the craft</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Meet our barbers</h2></div><p className="text-sm text-[#a5a098]" aria-live="polite">{loading ? 'Loading team…' : `${filtered.length} ${filtered.length === 1 ? 'professional' : 'professionals'} found`}</p></div>

        {loading ? <div role="status" className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-[390px] animate-pulse rounded-2xl border border-white/[.06] bg-white/[.03]" />)}</div>
          : error ? <div role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-950/20 p-8 text-sm text-red-200">{error}</div>
            : filtered.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((person) => <article key={person.id} className="barber-profile-card group flex min-w-0 flex-col overflow-hidden rounded-2xl">
                <div className="barber-profile-art relative flex h-56 items-center justify-center overflow-hidden">
                  {person.imageUrl ? <img src={person.imageUrl} alt={person.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <><span className="barber-profile-orb" /><div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border border-[#c6a15b]/25 bg-[#c6a15b]/[.08] text-[#e0c58f]"><UserRound size={42} strokeWidth={1.1} /></div></>}
                  <span className="absolute bottom-4 left-5 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.18em] text-white/75 backdrop-blur">{person.title}</span>
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h3 className="text-xl font-semibold tracking-tight text-white">{person.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#a5a098]"><Store size={13} className="text-[#c6a15b]" /><span className="truncate">{person.salon.name}</span><BadgeCheck size={14} className="text-[#c6a15b]" aria-label="Listed salon" /></p>
                  <p className="mt-4 min-h-10 text-sm leading-5 text-[#a5a098]">{person.bio || 'A dedicated professional focused on quality grooming and personal care.'}</p>
                  {person.specialties.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{person.specialties.map((skill) => <span key={skill} className="rounded-full border border-[#c6a15b]/15 bg-[#c6a15b]/[.06] px-3 py-1 text-[11px] text-[#e0c58f]">{skill}</span>)}</div>}
                  {person.salon.address && <p className="mt-5 flex items-center gap-2 border-t border-white/[.07] pt-4 text-xs text-[#a5a098]"><MapPin size={14} className="shrink-0 text-[#c6a15b]" /><span className="truncate">{person.salon.address}</span></p>}
                  <Link href={`/salons/${encodeURIComponent(person.salon.slug)}/booking`} className="barbers-book-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white">Book at this salon <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
                </div>
              </article>)}
            </div>
              : <div className="mt-6 rounded-2xl border border-white/[.08] bg-white/[.025] px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#c6a15b]/20 bg-[#c6a15b]/[.08] text-[#c6a15b]"><Scissors size={25} /></div><h3 className="mt-5 text-xl font-semibold text-white">{items.length ? 'No matching professionals' : 'Our team is growing'}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#a5a098]">{items.length ? 'Try another search or choose a different salon.' : 'Barber profiles will appear here when active salons add their team members.'}</p></div>}
      </div>
    </main>
  );
}
