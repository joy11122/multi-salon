'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Clock3, MapPin, Search, Scissors, Sparkles, Store, Tag, X } from 'lucide-react';

type SalonOption = { name: string; slug: string };
type ServiceItem = {
  id: string; name: string; description: string; category: string; price: number; durationMinutes: number;
  salon: { name: string; slug: string; address: string };
};

const money = (amount: number) => new Intl.NumberFormat('en-BD', {
  style: 'currency', currency: 'BDT', maximumFractionDigits: 0,
}).format(amount);

function ServiceArtwork({ category }: { category: string }) {
  const value = category.toLowerCase();
  const Icon = value.includes('facial') || value.includes('skin') ? Sparkles
    : value.includes('hair') || value.includes('cut') ? Scissors : Tag;
  return (
    <div className="services-artwork relative flex h-40 items-center justify-center overflow-hidden sm:h-44">
      <span className="services-art-orb services-art-orb-one" />
      <span className="services-art-orb services-art-orb-two" />
      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/[.07] text-[#c6a15b] shadow-2xl backdrop-blur-md">
        <Icon size={34} strokeWidth={1.35} aria-hidden="true" />
      </div>
      <span className="absolute bottom-4 left-5 text-[10px] font-semibold uppercase tracking-[.24em] text-white/50">MULTI-SALON / CARE</span>
      <span className="absolute right-5 top-4 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-medium text-white/75">{category}</span>
    </div>
  );
}

export function ServicesDirectory() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [salons, setSalons] = useState<SalonOption[]>([]);
  const [search, setSearch] = useState('');
  const [salonFilter, setSalonFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadCatalog() {
      try {
        const response = await fetch('/api/services', { signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load services.');
        setItems(Array.isArray(data.items) ? data.items : []);
        setSalons(Array.isArray(data.salons) ? data.salons : []);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load services.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadCatalog();
    return () => controller.abort();
  }, []);

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesSalon = salonFilter === 'all' || item.salon.slug === salonFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const searchable = [item.name, item.description, item.category, item.salon.name, item.salon.address].join(' ').toLocaleLowerCase();
      return matchesSalon && matchesCategory && (!query || searchable.includes(query));
    });
  }, [items, search, salonFilter, categoryFilter]);
  const hasFilters = Boolean(search || salonFilter !== 'all' || categoryFilter !== 'all');
  const clearFilters = () => { setSearch(''); setSalonFilter('all'); setCategoryFilter('all'); };

  return (
    <main className="services-page min-h-screen px-4 pb-20 pt-10 sm:px-6 lg:px-10 lg:pt-14">
      <div className="mx-auto max-w-7xl">
        <header className="services-heading relative overflow-hidden rounded-[2rem] border border-white/[.07] px-6 py-10 sm:px-10 sm:py-14">
          <div className="services-heading-glow" />
          <div className="relative z-10 max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.24em] text-[#c6a15b]"><span className="h-px w-8 bg-[#c6a15b]" /> Explore our services</p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-.04em] text-white sm:text-5xl lg:text-6xl">Premium care.<br /><span className="services-gradient-text">Your style, your choice.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#d8d2c7] sm:text-base">Discover trusted salon services, compare prices and book your next appointment with ease.</p>
          </div>
          <div className="pointer-events-none absolute -bottom-20 right-[-2rem] hidden h-80 w-80 rounded-full border border-[#c6a15b]/10 lg:block" />
          <div className="pointer-events-none absolute -bottom-10 right-10 hidden h-56 w-56 rounded-full border border-[#c6a15b]/10 lg:block" />
          <div className="pointer-events-none absolute right-24 top-12 hidden text-[#c6a15b]/10 lg:block"><Scissors size={150} strokeWidth={0.7} /></div>
        </header>

        <section aria-label="Filter services" className="services-filter mt-7 grid gap-3 rounded-2xl border border-white/[.08] p-3 sm:p-4 lg:grid-cols-[minmax(220px,1.5fr)_minmax(170px,.8fr)_minmax(170px,.8fr)_auto]">
          <label className="relative block"><span className="sr-only">Search services or salons</span><Search size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a5a098]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services or salons…" className="w-full rounded-xl border border-white/[.08] bg-[#0b0b0b] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-[#77736b] focus:border-[#c6a15b]/60 focus:ring-2 focus:ring-[#c6a15b]/10" /></label>
          <label className="relative block"><span className="sr-only">Filter by salon</span><Store size={17} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a5a098]" /><select value={salonFilter} onChange={(event) => setSalonFilter(event.target.value)} className="w-full appearance-none rounded-xl border border-white/[.08] bg-[#0b0b0b] py-3.5 pl-11 pr-9 text-sm text-[#d8d2c7] outline-none transition focus:border-[#c6a15b]/60"><option value="all">All salons</option>{salons.map((salon) => <option key={salon.slug} value={salon.slug}>{salon.name}</option>)}</select></label>
          <label className="relative block"><span className="sr-only">Filter by category</span><Tag size={17} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a5a098]" /><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full appearance-none rounded-xl border border-white/[.08] bg-[#0b0b0b] py-3.5 pl-11 pr-9 text-sm text-[#d8d2c7] outline-none transition focus:border-[#c6a15b]/60"><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          {hasFilters ? <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-[#d8d2c7] transition hover:border-[#c6a15b]/40 hover:text-white"><X size={16} /> Clear</button> : <div className="hidden items-center px-3 text-xs text-[#77736b] lg:flex">Refine your search</div>}
        </section>

        <div className="mt-9 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[.22em] text-[#c6a15b]">Curated for you</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Explore services</h2></div><p className="text-sm text-[#a5a098]" aria-live="polite">{loading ? 'Loading services…' : `${filteredItems.length} ${filteredItems.length === 1 ? 'service' : 'services'} found`}</p></div>

        {loading ? <div role="status" className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[420px] animate-pulse rounded-2xl border border-white/[.06] bg-white/[.03]" />)}</div>
          : error ? <div role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-950/20 p-8 text-sm text-red-200">{error}</div>
            : filteredItems.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((service) => <article key={service.id} className="premium-service-card group flex min-w-0 flex-col overflow-hidden rounded-2xl">
                <ServiceArtwork category={service.category} />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-semibold tracking-tight text-white">{service.name}</h3><p className="mt-1 flex items-center gap-1.5 text-xs text-[#a5a098]"><Store size={13} className="shrink-0 text-[#c6a15b]" /><span className="truncate">{service.salon.name}</span><BadgeCheck size={14} className="shrink-0 text-[#c6a15b]" aria-label="Listed salon" /></p></div><span className="shrink-0 rounded-lg border border-[#c6a15b]/20 bg-[#c6a15b]/[.08] px-2.5 py-1.5 text-sm font-semibold text-[#c6a15b]">{money(service.price)}</span></div>
                  <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-[#a5a098]">{service.description || 'A professional salon service, delivered with care.'}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[.07] pt-4 text-xs text-[#a5a098]"><span className="inline-flex items-center gap-1.5"><Clock3 size={14} className="text-[#c6a15b]" /> {service.durationMinutes} min</span>{service.salon.address && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin size={14} className="shrink-0 text-[#c6a15b]" /><span className="truncate">{service.salon.address}</span></span>}</div>
                  <Link href={`/salons/${encodeURIComponent(service.salon.slug)}/booking`} className="services-book-button mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white">Book this service <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
                </div>
              </article>)}
            </div>
              : <div className="mt-6 rounded-2xl border border-white/[.08] bg-white/[.025] px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#c6a15b]/20 bg-[#c6a15b]/[.08] text-[#c6a15b]"><Scissors size={25} /></div><h3 className="mt-5 text-xl font-semibold text-white">{items.length ? 'No matching services' : 'Services are coming soon'}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#a5a098]">{items.length ? 'Try another search term or adjust your filters.' : 'No active salon has published a service yet. Please check back soon.'}</p>{hasFilters && <button type="button" onClick={clearFilters} className="mt-5 rounded-xl border border-[#c6a15b]/30 px-5 py-2.5 text-sm font-medium text-[#c6a15b] transition hover:bg-[#c6a15b]/10">Clear filters</button>}</div>}
      </div>
    </main>
  );
}
