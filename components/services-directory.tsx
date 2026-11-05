'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, MapPin, Search, Scissors } from 'lucide-react';

type SalonOption = { name: string; slug: string };
type ServiceItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  durationMinutes: number;
  salon: { name: string; slug: string; address: string };
};

const money = (amount: number) => new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  maximumFractionDigits: 0,
}).format(amount);

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
        const response = await fetch('/api/services', {
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load services.');
        setItems(Array.isArray(data.items) ? data.items : []);
        setSalons(Array.isArray(data.salons) ? data.salons : []);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Could not load services.');
        }
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
      const searchable = [item.name, item.description, item.category, item.salon.name, item.salon.address]
        .join(' ')
        .toLocaleLowerCase();
      return matchesSalon && matchesCategory && (!query || searchable.includes(query));
    });
  }, [items, search, salonFilter, categoryFilter]);

  return (
    <main className="min-h-screen px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">THE MULTI-SALON SERVICE DIRECTORY</p>
        <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="serif text-5xl md:text-6xl">Find your <span className="gold italic">next look.</span></h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#999]">
              Explore services and prices from salons on our platform. Choose a service and book directly with the salon.
            </p>
          </div>
          <p className="text-xs tracking-widest text-[#c6a15b]">
            {loading ? 'LOADING DIRECTORY' : `${filteredItems.length} SERVICES AVAILABLE`}
          </p>
        </div>

        <section aria-label="Filter services" className="mt-10 grid gap-3 border border-white/10 bg-[#141414] p-4 md:grid-cols-[1.5fr_1fr_1fr] md:p-5">
          <label className="relative block">
            <span className="sr-only">Search services or salons</span>
            <Search size={17} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search service or salon…"
              className="w-full border border-white/15 bg-[#0b0b0b] py-3 pl-11 pr-4 text-sm text-[#f5f1e8] outline-none focus:border-[#c6a15b]"
            />
          </label>
          <label className="block">
            <span className="sr-only">Filter by salon</span>
            <select value={salonFilter} onChange={(event) => setSalonFilter(event.target.value)} className="w-full border border-white/15 bg-[#0b0b0b] px-4 py-3 text-sm text-[#eee] outline-none focus:border-[#c6a15b]">
              <option value="all">All salons</option>
              {salons.map((salon) => <option key={salon.slug} value={salon.slug}>{salon.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Filter by category</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full border border-white/15 bg-[#0b0b0b] px-4 py-3 text-sm text-[#eee] outline-none focus:border-[#c6a15b]">
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
        </section>

        {loading ? (
          <div role="status" className="mt-10 border border-white/10 p-10 text-center text-sm text-[#999]">Loading services from active salons…</div>
        ) : error ? (
          <div role="alert" className="mt-10 border border-red-500/30 bg-red-950/20 p-8 text-sm text-red-200">{error}</div>
        ) : filteredItems.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((service) => (
              <article key={service.id} className="service-card flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.18em] text-[#c6a15b]">
                    <Scissors size={13} aria-hidden="true" /> {service.category}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-[#c6a15b]">{money(service.price)}</span>
                </div>
                <h2 className="serif mt-5 text-2xl">{service.name}</h2>
                <p className="mt-3 min-h-12 flex-1 text-sm leading-6 text-[#999]">{service.description || 'Contact the salon for more details about this service.'}</p>
                <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs text-[#999]">
                  <p className="flex items-center gap-2"><MapPin size={14} className="shrink-0 text-[#c6a15b]" /> <span>{service.salon.name}</span></p>
                  {service.salon.address && <p className="pl-[22px] text-[#777]">{service.salon.address}</p>}
                  <p className="flex items-center gap-2"><Clock3 size={14} className="text-[#c6a15b]" /> {service.durationMinutes} minutes</p>
                </div>
                <Link href={`/salons/${encodeURIComponent(service.salon.slug)}/booking`} className="gold-button mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 text-[10px] font-semibold tracking-[.18em]">
                  BOOK THIS SERVICE <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 border border-white/10 bg-[#141414] px-6 py-14 text-center">
            <Scissors size={30} aria-hidden="true" className="mx-auto text-[#c6a15b]" />
            <h2 className="serif mt-5 text-2xl">{items.length ? 'No matching services found' : 'Services are coming soon'}</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#999]">
              {items.length
                ? 'Try another search term or clear one of the filters.'
                : 'No active salon has published a service yet. Please check back soon.'}
            </p>
            {(search || salonFilter !== 'all' || categoryFilter !== 'all') && (
              <button type="button" onClick={() => { setSearch(''); setSalonFilter('all'); setCategoryFilter('all'); }} className="outline-gold mt-6 px-5 py-3 text-xs tracking-widest">
                CLEAR FILTERS
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
