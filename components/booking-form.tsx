'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, LoaderCircle, Search, X } from 'lucide-react';

type Service = { _id: string; name: string; description?: string; category?: string; price: number; durationMinutes: number };
type Barber = { _id: string; name: string; title?: string };
type Slot = { time: string; staffId: string; staffName: string };
type SalonDetails = { name: string; phone: string; address: string };
type BookingConfirmation = { bookingRef: string; salon: SalonDetails; services: Service[]; staffName: string; date: string; time: string; customerName: string; phone: string; email: string; notes: string; totalPrice: number; totalDuration: number; status: string; paymentStatus: string };
const inputClass = 'w-full border border-white/15 bg-[#101010] px-4 py-3 text-sm text-[#f5f1e8] outline-none transition focus:border-[#c6a15b]';
const MAX_SELECTED_SERVICES = 10;

type PublicSalon = { slug: string; name: string; address?: string };

export function BookingForm({ defaultName = '', defaultEmail = '', salonSlug, salons = [] }: { defaultName?: string; defaultEmail?: string; salonSlug?: string; salons?: PublicSalon[] }) {
  const [selectedSalonSlug, setSelectedSalonSlug] = useState(salonSlug || '');
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [staffId, setStaffId] = useState('any');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [details, setDetails] = useState({ customerName: defaultName, phone: '', email: defaultEmail, notes: '', notificationConsent: false });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [salon, setSalon] = useState<SalonDetails>({ name: 'Salon', phone: '', address: '' });
  const [step, setStep] = useState(1);

  const selectedServices = useMemo(() => selectedServiceIds.map((id) => services.find((item) => item._id === id)).filter((item): item is Service => Boolean(item)), [services, selectedServiceIds]);
  const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + Number(service.durationMinutes || 30), 0);
  const categories = useMemo(() => {
    const grouped = new Map<string, Service[]>();
    for (const service of services) {
      const category = service.category?.trim() || 'Other services';
      grouped.set(category, [...(grouped.get(category) || []), service]);
    }
    const query = search.trim().toLowerCase();
    return [...grouped.entries()].map(([name, items]) => ({
      name,
      items: query ? items.filter((item) => `${item.name} ${item.description || ''} ${name}`.toLowerCase().includes(query)) : items,
    })).filter((group) => group.items.length);
  }, [services, search]);

  useEffect(() => {
    if (!selectedSalonSlug) { setServices([]); setBarbers([]); setSalon({ name: 'Salon', phone: '', address: '' }); setLoading(false); return; }
    setLoading(true); setError('');
    fetch('/api/booking?salonSlug=' + encodeURIComponent(selectedSalonSlug), { cache: 'no-store' }).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); const catalog = data.services || []; setServices(catalog); setBarbers(data.staff || []); setSalon(data.salon || { name: 'Salon', phone: '', address: '' }); setSelectedServiceIds([]); setStaffId('any'); setDate(''); setTime(''); setSlots([]); setStep(1); setOpenCategories(catalog.length ? [catalog[0].category?.trim() || 'Other services'] : []); }).catch((e) => { setServices([]); setBarbers([]); setError(e.message || 'Booking is unavailable.'); }).finally(() => setLoading(false));
  }, [selectedSalonSlug]);

  useEffect(() => {
    if (!selectedServiceIds.length || !date) { setSlots([]); return; }
    setTime('');
    const params = new URLSearchParams({ date, serviceIds: selectedServiceIds.join(','), staffId });
    if (selectedSalonSlug) params.set('salonSlug', selectedSalonSlug);
    fetch(`/api/availability?${params.toString()}`)
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); setSlots(data.slots || []); })
      .catch((e) => { setSlots([]); setError(e.message || 'Could not load times.'); });
  }, [selectedServiceIds, staffId, date, selectedSalonSlug]);

  function toggleService(serviceId: string) {
    setError('');
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(selectedServiceIds.filter((id) => id !== serviceId));
    } else {
      if (selectedServiceIds.length >= MAX_SELECTED_SERVICES) {
        setError(`You can select up to ${MAX_SELECTED_SERVICES} services per appointment.`);
        return;
      }
      setSelectedServiceIds([...selectedServiceIds, serviceId]);
    }
    setTime('');
  }

  function toggleCategory(category: string) {
    setOpenCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  }

  async function submit() {
    setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceIds: selectedServiceIds, staffId, date, time, ...details, ...(selectedSalonSlug ? { salonSlug: selectedSalonSlug } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Booking failed.');
      setConfirmation({ bookingRef: data.bookingRef, salon, services: selectedServices, staffName: staffId === 'any' ? (data.staffName || 'Assigned by salon') : (barbers.find((barber) => barber._id === staffId)?.name || 'Assigned by salon'), date, time, customerName: details.customerName, phone: details.phone, email: details.email, notes: details.notes, totalPrice, totalDuration, status: data.status || 'PENDING', paymentStatus: data.paymentStatus || 'UNPAID' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Booking failed.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#aaa]"><LoaderCircle className="animate-spin text-[#c6a15b]"/> Loading appointment options…</div>;
  if (confirmation) return <div className="mx-auto max-w-3xl">
    <section className="booking-print-sheet border border-[#c6a15b]/40 bg-[#171717] p-7 text-[#f5f1e8] md:p-12">
      <div className="text-center"><CheckCircle2 className="mx-auto text-[#c6a15b]" size={42}/><p className="eyebrow mt-5">BOOKING CONFIRMATION</p><h2 className="serif mt-3 text-3xl">{confirmation.salon.name}</h2><p className="mt-2 text-sm text-[#aaa]">Appointment request received</p><p className="mt-5 text-xs uppercase tracking-[.2em] text-[#999]">Booking reference</p><p className="mt-2 text-2xl font-semibold tracking-widest text-[#c6a15b]">{confirmation.bookingRef}</p></div>
      <div className="mt-8 grid gap-5 border-y border-white/10 py-6 sm:grid-cols-2">
        <div><p className="eyebrow">CUSTOMER</p><p className="mt-2 text-sm">{confirmation.customerName}</p><p className="mt-1 text-sm text-[#aaa]">{confirmation.phone}</p>{confirmation.email&&<p className="mt-1 break-all text-sm text-[#aaa]">{confirmation.email}</p>}</div>
        <div><p className="eyebrow">APPOINTMENT</p><p className="mt-2 text-sm">{confirmation.date} · {confirmation.time}</p><p className="mt-1 text-sm text-[#aaa]">Barber: {confirmation.staffName}</p><p className="mt-1 text-sm text-[#aaa]">Duration: {confirmation.totalDuration} minutes</p></div>
      </div>
      <div className="mt-7"><p className="eyebrow">SELECTED SERVICES</p><div className="mt-3 divide-y divide-white/10">{confirmation.services.map((service)=><div key={service._id} className="flex justify-between gap-4 py-3 text-sm"><span>{service.name}</span><span className="shrink-0 text-[#c6a15b]">৳{Number(service.price||0).toLocaleString('en-BD')}</span></div>)}</div><div className="mt-3 flex justify-between border-t border-white/10 pt-4 text-base font-semibold"><span>Total</span><span className="text-[#c6a15b]">৳{confirmation.totalPrice.toLocaleString('en-BD')}</span></div></div>
      <div className="mt-7 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2"><div><p className="eyebrow">BOOKING STATUS</p><p className="mt-2 text-sm">{confirmation.status}</p></div><div><p className="eyebrow">PAYMENT STATUS</p><p className="mt-2 text-sm">{confirmation.paymentStatus}</p></div></div>
      {confirmation.notes&&<div className="mt-5"><p className="eyebrow">CUSTOMER NOTES</p><p className="mt-2 whitespace-pre-wrap text-sm text-[#aaa]">{confirmation.notes}</p></div>}
      <div className="mt-8 border-t border-white/10 pt-5 text-center text-xs leading-6 text-[#999]"><p>{confirmation.salon.address}</p>{confirmation.salon.phone&&<p>{confirmation.salon.phone}</p>}<p className="mt-2">Please keep this booking confirmation. The salon will contact you to confirm your appointment.</p></div>
    </section>
    <div className="booking-screen-actions mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={()=>window.print()} className="gold-button inline-flex items-center gap-2 px-6 py-3 text-xs font-semibold tracking-widest">DOWNLOAD PDF / PRINT</button><button type="button" onClick={()=>window.location.reload()} className="outline-gold px-6 py-3 text-xs tracking-widest">MAKE ANOTHER BOOKING</button></div>
    <p className="booking-screen-actions mt-3 text-center text-xs text-[#999]">Choose “Save as PDF” in your browser’s print destination to download the PDF.</p>
  </div>;

  return <div className="grid gap-10 lg:grid-cols-[1fr_330px]">
    <div className="border border-white/10 bg-[#141414] p-5 md:p-9">
      <div className="mb-9 flex items-center gap-3">{[1,2,3].map((n)=><div key={n} className="flex flex-1 items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${step>=n?'border-[#c6a15b] bg-[#c6a15b] text-black':'border-white/20 text-[#999]'}`}>{n}</span><span className={`hidden text-[9px] tracking-widest sm:block ${step>=n?'text-[#c6a15b]':'text-[#777]'}`}>{['SERVICES & TIME','YOUR DETAILS','CONFIRM'][n-1]}</span>{n!==3&&<span className="h-px flex-1 bg-white/10"/>}</div>)}</div>
      {step===1&&<div>
        <p className="eyebrow">STEP 01</p><h2 className="serif mt-3 text-3xl">Choose your experience.</h2>
        <p className="mt-2 text-sm text-[#999]">Browse by category and select all the services you need.</p>
        {salons.length > 0 && <label className="mt-6 block"><span className="eyebrow">SELECT SALON</span><select aria-label="Select salon" className={`${inputClass} mt-2`} value={selectedSalonSlug} onChange={(event)=>setSelectedSalonSlug(event.target.value)}><option value="">Choose a salon</option>{salons.map((item)=><option key={item.slug} value={item.slug}>{item.name}{item.address ? ` · ${item.address}` : ''}</option>)}</select></label>}
        {!salons.length && !salonSlug && <p className="mt-5 border border-[#c6a15b]/30 p-4 text-sm text-[#c6a15b]">No active salons are available for online booking yet.</p>}
        {selectedSalonSlug ? <>
        {!services.length&&<p className="mt-5 border border-[#c6a15b]/30 p-4 text-sm text-[#c6a15b]">The service menu is not configured yet. Please check back soon.</p>}
        {!barbers.length&&<p className="mt-3 border border-[#c6a15b]/30 p-4 text-sm text-[#c6a15b]">Online booking will open once the salon team has been added by the administrator.</p>}
        <label className="relative mt-6 block"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search services…" aria-label="Search services" className={`${inputClass} pl-11`}/></label>
        <div className="mt-4 space-y-3">
          {categories.map((group) => {
            const expanded = openCategories.includes(group.name);
            const selectedInGroup = group.items.filter((item) => selectedServiceIds.includes(item._id)).length;
            return <section key={group.name} className="overflow-hidden border border-white/10">
              <button type="button" onClick={()=>toggleCategory(group.name)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 bg-[#1b1b1b] px-4 py-4 text-left hover:bg-[#222]">
                <span><span className="block text-sm font-medium text-[#f1ede4]">{group.name}</span><span className="mt-1 block text-xs text-[#888]">{group.items.length} {group.items.length===1?'service':'services'}{selectedInGroup>0? ` · ${selectedInGroup} selected`:''}</span></span>
                <ChevronDown size={18} className={`shrink-0 text-[#c6a15b] transition-transform ${expanded?'rotate-180':''}`}/>
              </button>
              {expanded&&<div className="divide-y divide-white/10">{group.items.map((service)=> {
                const checked = selectedServiceIds.includes(service._id);
                return <label key={service._id} className={`flex cursor-pointer items-center gap-3 px-4 py-4 transition hover:bg-white/[0.03] ${checked?'bg-[#c6a15b]/[0.06]':''}`}>
                  <input type="checkbox" checked={checked} onChange={()=>toggleService(service._id)} className="h-4 w-4 shrink-0 accent-[#c6a15b]"/>
                  <span className="min-w-0 flex-1"><span className="block text-sm text-[#eee]">{service.name}</span>{service.description&&<span className="mt-1 block text-xs leading-5 text-[#888]">{service.description}</span>}<span className="mt-1 block text-xs text-[#888]">{Number(service.durationMinutes||30)} minutes</span></span>
                  <span className="shrink-0 text-sm text-[#c6a15b]">৳{Number(service.price||0).toLocaleString('en-BD')}</span>
                </label>;
              })}</div>}
            </section>;
          })}
          {!categories.length&&<p className="border border-white/10 p-4 text-sm text-[#999]">No services match your search.</p>}
        </div>
        {selectedServices.length>0&&<div className="mt-5 border border-[#c6a15b]/30 bg-[#c6a15b]/[0.05] p-4">
          <div className="flex items-center justify-between gap-3"><p className="text-sm text-[#eee]">{selectedServices.length} {selectedServices.length===1?'service':'services'} selected</p><button type="button" onClick={()=>{setSelectedServiceIds([]);setTime('');}} className="inline-flex items-center gap-1 text-xs text-[#c6a15b] hover:text-[#f0d49b]"><X size={13}/> Clear all</button></div>
          <div className="mt-3 flex flex-wrap gap-2">{selectedServices.map((service)=><span key={service._id} className="border border-white/10 px-2 py-1 text-xs text-[#ccc]">{service.name}</span>)}</div>
          <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-3 text-sm"><span className="text-[#aaa]">Total duration: <strong className="text-[#eee]">{totalDuration} min</strong></span><span className="text-[#aaa]">Total: <strong className="text-[#c6a15b]">৳{totalPrice.toLocaleString('en-BD')}</strong></span></div>
          <p className="mt-2 text-[11px] text-[#888]">Up to {MAX_SELECTED_SERVICES} services can be combined in one appointment.</p>
        </div>}
        <div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="block"><span className="eyebrow">BARBER</span><select className={`${inputClass} mt-2`} value={staffId} onChange={(e)=>setStaffId(e.target.value)}><option value="any">Any available barber</option>{barbers.map((b)=><option key={b._id} value={b._id}>{b.name}{b.title?` · ${b.title}`:''}</option>)}</select></label><label className="block"><span className="eyebrow">DATE</span><input className={`${inputClass} mt-2`} type="date" min={new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)} value={date} onChange={(e)=>setDate(e.target.value)}/></label></div>
        {date&&selectedServices.length>0&&<div className="mt-7"><p className="eyebrow">AVAILABLE TIMES · {totalDuration} MINUTES</p><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map((slot)=><button type="button" key={`${slot.time}-${slot.staffId}`} onClick={()=>setTime(slot.time)} aria-pressed={time===slot.time} className={`border px-3 py-3 text-xs ${time===slot.time?'border-[#c6a15b] bg-[#c6a15b] text-black':'border-white/15 text-[#ddd] hover:border-[#c6a15b]'}`}>{slot.time}</button>)}</div>{!slots.length&&<p className="mt-3 text-sm text-[#999]">No available slots for this date and combination. Try another day or change your services.</p>}</div>}
        <div className="mt-8 flex justify-end"><button disabled={!selectedServices.length||!date||!time||!barbers.length} onClick={()=>setStep(2)} className="gold-button inline-flex items-center gap-2 px-6 py-3 text-[10px] tracking-widest disabled:cursor-not-allowed disabled:opacity-40">CONTINUE <ChevronRight size={15}/></button></div>
        </> : <p className="mt-5 border border-white/10 p-4 text-sm text-[#999]">Select a salon above to view its live services, team and available appointment times.</p>}
      </div>}
      {step===2&&<div><p className="eyebrow">STEP 02</p><h2 className="serif mt-3 text-3xl">A few details.</h2><div className="mt-7 grid gap-5 sm:grid-cols-2">{([['customerName','Full name','text'],['phone','Mobile number','tel'],['email','Email (optional)','email']] as const).map(([key,label,type])=><label key={key} className="block"><span className="eyebrow">{label}</span><input className={`${inputClass} mt-2`} type={type} required={key!=='email'} value={details[key]} onChange={(e)=>setDetails({...details,[key]:e.target.value})}/></label>)}</div><label className="mt-5 block"><span className="eyebrow">NOTES (OPTIONAL)</span><textarea className={`${inputClass} mt-2`} rows={3} maxLength={500} value={details.notes} onChange={(e)=>setDetails({...details,notes:e.target.value})} placeholder="Anything your barber should know?"/></label><label className="mt-4 flex items-start gap-3 text-xs leading-5 text-[#aaa]"><input type="checkbox" checked={details.notificationConsent} onChange={e=>setDetails({...details,notificationConsent:e.target.checked})} className="mt-1"/><span>I agree to receive booking-related SMS and WhatsApp updates about this appointment. I can contact the salon to opt out.</span></label><div className="mt-8 flex justify-between"><button onClick={()=>setStep(1)} className="outline-gold inline-flex items-center gap-2 px-5 py-3 text-[10px] tracking-widest"><ChevronLeft size={15}/> BACK</button><button disabled={!details.customerName.trim()||!/^((\+?8801|01)[3-9]\d{8})$/.test(details.phone.replace(/[\s-]/g,''))} onClick={()=>setStep(3)} className="gold-button px-6 py-3 text-[10px] tracking-widest disabled:opacity-40">REVIEW BOOKING</button></div></div>}
      {step===3&&<div><p className="eyebrow">STEP 03</p><h2 className="serif mt-3 text-3xl">Review your visit.</h2><div className="mt-7 space-y-4 border-y border-white/10 py-6 text-sm"><div><p className="text-[#999]">Selected services</p><ul className="mt-2 space-y-2">{selectedServices.map((service)=><li key={service._id} className="flex justify-between gap-4"><span>{service.name}</span><span className="shrink-0 text-[#c6a15b]">৳{Number(service.price||0).toLocaleString('en-BD')}</span></li>)}</ul></div><p className="flex justify-between gap-4"><span className="text-[#999]">Barber</span><span>{staffId==='any'?'Any available':barbers.find(b=>b._id===staffId)?.name}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Date & time</span><span>{date} · {time}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Name</span><span>{details.customerName}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Phone</span><span>{details.phone}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Total duration</span><span>{totalDuration} minutes</span></p><p className="flex justify-between gap-4 border-t border-white/10 pt-4 text-base"><span>Estimated total</span><span className="text-[#c6a15b]">৳{totalPrice.toLocaleString('en-BD')}</span></p></div><p className="mt-4 text-xs leading-6 text-[#999]">Your appointment is a request until the salon confirms it. Payment is not collected online at this stage.</p><div className="mt-8 flex justify-between"><button onClick={()=>setStep(2)} className="outline-gold px-5 py-3 text-[10px] tracking-widest">EDIT DETAILS</button><button disabled={submitting} onClick={submit} className="gold-button inline-flex items-center gap-2 px-6 py-3 text-[10px] tracking-widest disabled:opacity-50">{submitting?<LoaderCircle size={14} className="animate-spin"/>:'CONFIRM REQUEST'}</button></div></div>}
      {error&&<p role="alert" className="mt-6 border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</p>}
    </div>
    <aside className="h-fit border border-white/10 bg-[#141414] p-6"><p className="eyebrow">YOUR APPOINTMENT</p><h3 className="serif mt-3 text-2xl">A moment for you.</h3><p className="mt-4 text-sm leading-7 text-[#999]">Take a seat, slow down and leave the details to us.</p><div className="mt-7 space-y-4 border-t border-white/10 pt-5 text-xs text-[#aaa]"><p className="flex items-center gap-3"><Clock3 size={15} className="text-[#c6a15b]"/>Times shown in Bangladesh time</p><p>Booking requests are confirmed by the salon. No online payment is required.</p></div></aside>
  </div>;
}
