'use client';

import { useEffect, useState } from 'react';
import { LocateFixed } from 'lucide-react';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type Hours = { open: string; close: string; closed: boolean };

export function SettingsClient({ salonSlug }: { salonSlug?: string } = {}) {
  const [name, setName] = useState("The Gentlemen's Club");
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [hours, setHours] = useState<Hours[]>(days.map(() => ({ open: '10:00', close: '20:00', closed: false })));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const apiUrl = `/api/admin/settings${salonSlug ? `?salonSlug=${encodeURIComponent(salonSlug)}` : ''}`;

  useEffect(() => {
    let active = true;
    fetch(apiUrl).then((response) => response.json()).then((data) => {
      if (!active || !data.settings) return;
      setName(data.settings.name || "The Gentlemen's Club");
      setPhone(data.settings.phone || '');
      setAddress(data.settings.address || '');
      setLatitude(data.settings.latitude == null ? '' : String(data.settings.latitude));
      setLongitude(data.settings.longitude == null ? '' : String(data.settings.longitude));
      if (data.settings.openingHours?.length === 7) setHours(data.settings.openingHours);
    }).catch(() => { if (active) setMessage('Could not load saved settings.'); });
    return () => { active = false; };
  }, [apiUrl]);

  function detectLocation() {
    if (!navigator.geolocation) {
      setMessage('This browser does not support GPS location.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setMessage('GPS coordinates added. Save settings to publish your salon location.');
      },
      () => setMessage('Could not access GPS. Enter coordinates manually instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const latitudeValue = latitude.trim() ? Number(latitude) : null;
      const longitudeValue = longitude.trim() ? Number(longitude) : null;
      if ((latitudeValue === null) !== (longitudeValue === null)) throw new Error('Enter both latitude and longitude, or clear both fields.');
      if (latitudeValue !== null && (!Number.isFinite(latitudeValue) || latitudeValue < -90 || latitudeValue > 90)) throw new Error('Latitude must be between -90 and 90.');
      if (longitudeValue !== null && (!Number.isFinite(longitudeValue) || longitudeValue < -180 || longitudeValue > 180)) throw new Error('Longitude must be between -180 and 180.');
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, address, openingHours: hours, latitude: latitudeValue, longitude: longitudeValue }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save settings.');
      setMessage('Settings saved. Your salon location is now available in nearby search.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-3xl">
      <p className="eyebrow">SALON CONFIGURATION</p>
      <h2 className="serif mt-2 text-3xl">Settings</h2>
      <div className="mt-7 grid gap-5 border border-white/10 bg-[#151515] p-6 sm:grid-cols-2">
        <label><span className="eyebrow">BUSINESS NAME</span><input required minLength={2} maxLength={100} className="mt-2 w-full border border-white/15 bg-[#0b0b0b] p-3 text-sm" value={name} onChange={(event) => setName(event.target.value)}/></label>
        <label><span className="eyebrow">PHONE / WHATSAPP</span><input maxLength={30} className="mt-2 w-full border border-white/15 bg-[#0b0b0b] p-3 text-sm" value={phone} onChange={(event) => setPhone(event.target.value)}/></label>
        <label className="sm:col-span-2"><span className="eyebrow">SALON ADDRESS</span><input maxLength={300} className="mt-2 w-full border border-white/15 bg-[#0b0b0b] p-3 text-sm" value={address} onChange={(event) => setAddress(event.target.value)}/></label>
        {salonSlug && (
          <div className="sm:col-span-2 border border-white/10 bg-[#0b0b0b] p-4">
            <p className="eyebrow">MAP LOCATION · FREE OPENSTREETMAP</p>
            <p className="mt-2 text-xs leading-6 text-[#999]">Use your phone or computer GPS while standing at the salon, or copy coordinates from OpenStreetMap. Both values are required to appear in nearby searches.</p>
            <button type="button" onClick={detectLocation} className="outline-gold mt-3 inline-flex items-center gap-2 px-4 py-3 text-[10px] tracking-widest"><LocateFixed size={14}/> USE THIS DEVICE GPS</button>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-[#c6a15b]">LATITUDE<input inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="22.8456" className="mt-2 w-full border border-white/15 bg-[#151515] p-3 text-sm text-white"/></label>
              <label className="text-xs text-[#c6a15b]">LONGITUDE<input inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="89.5403" className="mt-2 w-full border border-white/15 bg-[#151515] p-3 text-sm text-white"/></label>
            </div>
            <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-[#c6a15b] underline">OpenStreetMap to find coordinates</a>
          </div>
        )}
        <div className="sm:col-span-2">
          <p className="eyebrow mb-4">WEEKLY OPENING HOURS · BANGLADESH TIME</p>
          <div className="space-y-1">
            {days.map((day, index) => (
              <div key={day} className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-white/10 py-4 text-xs sm:grid-cols-[minmax(7rem,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:py-3">
                <span className="min-w-0 self-center font-medium text-[#f5f1e8]">{day}</span>
                <label className="col-start-2 row-start-1 flex min-h-10 items-center justify-end gap-2 whitespace-nowrap text-[#c6a15b] sm:col-start-4 sm:row-start-1">
                  <input
                    type="checkbox"
                    checked={hours[index].closed}
                    onChange={(event) => setHours(hours.map((item, itemIndex) => itemIndex === index ? { ...item, closed: event.target.checked } : item))}
                    className="h-4 w-4 accent-[#c6a15b]"
                  />
                  Closed
                </label>
                <label className="col-start-1 row-start-2 min-w-0 text-[10px] tracking-wider text-[#999] sm:col-start-2 sm:row-start-1">
                  OPENS
                  <input
                    aria-label={`${day} opening time`}
                    type="time"
                    disabled={hours[index].closed}
                    value={hours[index].open}
                    onChange={(event) => setHours(hours.map((item, itemIndex) => itemIndex === index ? { ...item, open: event.target.value } : item))}
                    className="mt-1 block min-h-11 w-full min-w-0 rounded-sm border border-white/10 bg-[#0b0b0b] px-2 text-sm text-white [color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </label>
                <label className="col-start-2 row-start-2 min-w-0 text-[10px] tracking-wider text-[#999] sm:col-start-3 sm:row-start-1">
                  CLOSES
                  <input
                    aria-label={`${day} closing time`}
                    type="time"
                    disabled={hours[index].closed}
                    value={hours[index].close}
                    onChange={(event) => setHours(hours.map((item, itemIndex) => itemIndex === index ? { ...item, close: event.target.value } : item))}
                    className="mt-1 block min-h-11 w-full min-w-0 rounded-sm border border-white/10 bg-[#0b0b0b] px-2 text-sm text-white [color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
        <button disabled={busy} className="gold-button px-6 py-4 text-[10px] tracking-widest sm:col-span-2">{busy ? 'SAVING…' : 'SAVE SETTINGS'}</button>
        {message && <p role="status" className="text-sm text-[#c6a15b] sm:col-span-2">{message}</p>}
      </div>
    </form>
  );
}
