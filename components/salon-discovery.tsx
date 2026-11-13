'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Navigation, Search, LocateFixed, ExternalLink } from 'lucide-react';
import { distanceKm } from '@/lib/geo';

type Salon = {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
};

type DiscoveryResponse = { salons?: Salon[]; error?: string };

export function SalonDiscovery() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [area, setArea] = useState('');
  const [radius, setRadius] = useState('10');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const search = useCallback(async (options?: { lat: number; lng: number; radiusKm?: string }) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (options) {
        params.set('lat', String(options.lat));
        params.set('lng', String(options.lng));
        params.set('radius', options.radiusKm || radius);
      } else if (area.trim()) {
        params.set('area', area.trim());
      }
      const response = await fetch(`/api/salons/nearby?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json() as DiscoveryResponse;
      if (!response.ok) throw new Error(data.error || 'Could not find salons.');
      setSalons(Array.isArray(data.salons) ? data.salons : []);
      setNotice(options ? `Showing salons within ${options.radiusKm || radius} km of your location.` : area.trim() ? `Showing salon matches for “${area.trim()}”.` : 'Showing all published salons.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not find salons.');
    } finally {
      setLoading(false);
    }
  }, [area, radius]);

  useEffect(() => { void search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function useCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setError('Your browser does not support location. Search by area instead.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCoordinates(next);
        setArea('');
        setLocating(false);
        void search(next);
      },
      (positionError) => {
        setLocating(false);
        setError(positionError.code === positionError.PERMISSION_DENIED
          ? 'Location permission was denied. Enter your area to search instead.'
          : 'Could not detect your location. Please try again or search by area.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  const orderedSalons = useMemo(() => {
    if (!coordinates) return salons;
    return [...salons].sort((a, b) => {
      if (a.latitude === null || a.longitude === null) return 1;
      if (b.latitude === null || b.longitude === null) return -1;
      return distanceKm(coordinates.lat, coordinates.lng, a.latitude, a.longitude)
        - distanceKm(coordinates.lat, coordinates.lng, b.latitude, b.longitude);
    });
  }, [coordinates, salons]);

  return (
    <section className="mt-10">
      <div className="border border-white/10 bg-[#151515] p-5 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <form className="min-w-0 flex-1" onSubmit={(event) => { event.preventDefault(); setCoordinates(null); void search(); }}>
            <label htmlFor="salon-area" className="eyebrow">SEARCH BY CITY OR AREA</label>
            <div className="mt-2 flex gap-2">
              <input id="salon-area" value={area} onChange={(event) => setArea(event.target.value)} maxLength={80} placeholder="e.g. Khulna, Sonadanga, Dhaka" className="min-w-0 flex-1 border border-white/15 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none focus:border-[#c6a15b]" />
              <button type="submit" className="gold-button flex items-center gap-2 px-4 py-3 text-[10px] tracking-widest"><Search size={15}/> SEARCH</button>
            </div>
          </form>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="text-xs text-[#c6a15b]">DISTANCE
              <select value={radius} onChange={(event) => { const nextRadius = event.target.value; setRadius(nextRadius); if (coordinates) void search({ ...coordinates, radiusKm: nextRadius }); }} className="mt-2 block w-full border border-white/15 bg-[#0b0b0b] px-3 py-3 text-sm text-white sm:w-28">
                <option value="1">1 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option><option value="50">50 km</option>
              </select>
            </label>
            <button type="button" onClick={useCurrentLocation} disabled={locating} className="outline-gold flex min-h-11 items-center justify-center gap-2 px-4 py-3 text-[10px] tracking-widest disabled:opacity-50">
              <LocateFixed size={15}/>{locating ? 'LOCATING…' : 'USE MY LOCATION'}
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs leading-6 text-[#999]">Your location is used only in this search and is not saved to your account. Allow location access when your browser asks.</p>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow" aria-live="polite">{loading ? 'SEARCHING SALONS…' : notice}</p>
        {coordinates && <button type="button" onClick={() => { setCoordinates(null); void search(); }} className="text-xs text-[#c6a15b] underline">Clear nearby search</button>}
      </div>
      {error && <p role="alert" className="mt-5 border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-200">{error}</p>}
      {loading ? <p className="mt-6 text-sm text-[#999]">Finding salons…</p> : orderedSalons.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orderedSalons.map((salon) => {
            const distance = coordinates && salon.latitude !== null && salon.longitude !== null
              ? distanceKm(coordinates.lat, coordinates.lng, salon.latitude, salon.longitude) : null;
            const mapUrl = salon.latitude !== null && salon.longitude !== null
              ? `https://www.openstreetmap.org/?mlat=${salon.latitude}&mlon=${salon.longitude}#map=17/${salon.latitude}/${salon.longitude}`
              : `https://www.openstreetmap.org/search?query=${encodeURIComponent(salon.address || salon.name)}`;
            return (
              <article key={salon.id} className="border border-white/10 bg-[#151515] p-6">
                <p className="eyebrow">INDEPENDENT SALON</p>
                <h2 className="serif mt-3 text-2xl">{salon.name}</h2>
                {salon.address && <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#999]"><MapPin size={15} className="mt-1 shrink-0 text-[#c6a15b]"/>{salon.address}</p>}
                {distance !== null && <p className="mt-3 text-sm text-[#c6a15b]">{distance.toFixed(1)} km away</p>}
                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                  <Link href={`/salons/${encodeURIComponent(salon.slug)}`} className="gold-button inline-flex items-center px-4 py-3 text-[10px] tracking-widest">VIEW SALON</Link>
                  <a href={mapUrl} target="_blank" rel="noreferrer" className="outline-gold inline-flex items-center gap-2 px-4 py-3 text-[10px] tracking-widest"><Navigation size={13}/> MAP <ExternalLink size={12}/></a>
                </div>
              </article>
            );
          })}
        </div>
      ) : <p className="mt-6 border border-white/10 bg-[#151515] p-6 text-sm text-[#999]">No matching salons found. Try a wider distance or another area.</p>}
    </section>
  );
}
