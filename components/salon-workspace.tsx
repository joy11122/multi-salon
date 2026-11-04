'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Salon = { id: string; name: string; slug: string; phone: string; address: string; role: string };

export function SalonWorkspace() {
  const router = useRouter();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/salons', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load salons.');
      setSalons(data.salons || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load salons.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createSalon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/salons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, phone, address }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create salon.');
      setMessage('Salon created. Opening its management workspace…');
      router.push(`/salons/${encodeURIComponent(data.salon.slug)}/admin`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create salon.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-12 md:px-10 md:py-16">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">SALON WORKSPACES</p>
        <h1 className="serif mt-3 text-4xl">Your salons.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#999]">Create a salon workspace or manage a salon where you already have an active membership. Each salon has its own services, team, customers and appointments.</p>

        <section className="mt-9 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="serif text-2xl">Your memberships</h2>
            {loading ? <p className="mt-5 text-sm text-[#999]">Loading your salons…</p> : salons.length ? (
              <div className="mt-5 space-y-3">
                {salons.map((salon) => (
                  <article key={salon.id} className="border border-white/10 bg-[#151515] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="serif text-xl">{salon.name}</h3>
                        <p className="mt-2 text-xs text-[#999]">/salons/{salon.slug} · {salon.role}</p>
                        {salon.address && <p className="mt-2 text-xs text-[#888]">{salon.address}</p>}
                      </div>
                      <Link href={`/salons/${encodeURIComponent(salon.slug)}/admin`} className="gold-button px-4 py-3 text-[10px] tracking-widest">OPEN WORKSPACE</Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="mt-5 border border-white/10 bg-[#151515] p-6 text-sm text-[#999]">You do not belong to a salon yet. Create your first salon workspace.</p>}
          </div>

          <form onSubmit={createSalon} className="h-fit border border-white/10 bg-[#151515] p-6">
            <p className="eyebrow">NEW BUSINESS</p>
            <h2 className="serif mt-2 text-2xl">Create a salon.</h2>
            <label className="mt-5 block text-xs text-[#c6a15b]">SALON NAME<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full border border-white/15 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c6a15b]" placeholder="Your salon name"/></label>
            <label className="mt-4 block text-xs text-[#c6a15b]">URL SLUG (OPTIONAL)<input maxLength={60} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} className="mt-2 w-full border border-white/15 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c6a15b]" placeholder="your-salon-name"/></label>
            <label className="mt-4 block text-xs text-[#c6a15b]">PHONE<input maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 w-full border border-white/15 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c6a15b]"/></label>
            <label className="mt-4 block text-xs text-[#c6a15b]">ADDRESS<input maxLength={300} value={address} onChange={(event) => setAddress(event.target.value)} className="mt-2 w-full border border-white/15 bg-[#0b0b0b] px-3 py-3 text-sm text-white outline-none focus:border-[#c6a15b]"/></label>
            {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
            {message && <p role="status" className="mt-4 text-sm text-[#c6a15b]">{message}</p>}
            <button disabled={saving || !name.trim()} className="gold-button mt-5 w-full px-5 py-4 text-[10px] tracking-widest disabled:opacity-50">{saving ? 'CREATING…' : 'CREATE SALON'}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
