'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, LoaderCircle, Search, X } from 'lucide-react';

type Service = { _id: string; name: string; description?: string; category?: string; price: number; durationMinutes: number };
type Barber = { _id: string; name: string; title?: string };
type Slot = { time: string; staffId: string; staffName: string };
const inputClass = 'w-full border border-white/15 bg-[#101010] px-4 py-3 text-sm text-[#f5f1e8] outline-none transition focus:border-[#c6a15b]';
const MAX_SELECTED_SERVICES = 10;

export function BookingForm({ defaultName = '', defaultEmail = '', salonSlug }: { defaultName?: string; defaultEmail?: string; salonSlug?: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [staffId, setStaffId] = useState('any');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [details, setDetails] = useState({ customerName: defaultName, phone: '', email: defaultEmail, notes: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');
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
    fetch(`/api/booking${salonSlug ? `?salonSlug=${encodeURIComponent(salonSlug)}` : ''}`).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); const catalog = data.services || []; setServices(catalog); setBarbers(data.staff || []); if (catalog.length) setOpenCategories([catalog[0].category?.trim() || 'Other services']); }).catch((e) => setError(e.message || 'Booking is unavailable.')).finally(() => setLoading(false));
  }, [salonSlug]);

  useEffect(() => {
    if (!selectedServiceIds.length || !date) { setSlots([]); return; }
    setTime('');
    const params = new URLSearchParams({ date, serviceIds: selectedServiceIds.join(','), staffId });
    if (salonSlug) params.set('salonSlug', salonSlug);
    fetch(`/api/availability?${params.toString()}`)
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); setSlots(data.slots || []); })
      .catch((e) => { setSlots([]); setError(e.message || 'Could not load times.'); });
  }, [selectedServiceIds, staffId, date, salonSlug]);

  function toggleService(serviceId: string) {
    setError('');
    setSelectedServiceIds((current) => {
      if (current.includes(serviceId)) return current.filter((id) => id !== serviceId);
      if (current.length >= MAX_SELECTED_SERVICES) {
        setError(`You can select up to ${MAX_SELECTED_SERVICES} services per appointment.`);
        return current;
      }
      return [...current, serviceId];
    });
    setTime('');
  }

  function toggleCategory(category: string) {
    setOpenCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  }

  async function submit() {
    setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceIds: selectedServiceIds, staffId, date, time, ...details, ...(salonSlug ? { salonSlug } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Booking failed.');
      setConfirmation(data.bookingRef);
    } catch (e) { setError(e instanceof Error ? e.message : 'Booking failed.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#aaa]"><LoaderCircle className="animate-spin text-[#c6a15b]"/> Loading appointment options…</div>;
  if (confirmation) return <div className="border border-[#c6a15b]/40 bg-[#171717] p-8 text-center md:p-12"><CheckCircle2 className="mx-auto text-[#c6a15b]" size={42}/><p className="eyebrow mt-5">REQUEST RECEIVED</p><h2 className="serif mt-3 text-3xl">Your chair is requested.</h2><p className="mt-4 text-sm leading-7 text-[#aaa]">Your booking reference is</p><p className="mt-2 text-xl tracking-widest text-[#c6a15b]">{confirmation}</p><p className="mt-5 text-sm text-[#aaa]">The salon will confirm your appointment. Please keep this reference.</p></div>;

  return <div className="grid gap-10 lg:grid-cols-[1fr_330px]">
    <div className="border border-white/10 bg-[#141414] p-5 md:p-9">
      <div className="mb-9 flex items-center gap-3">{[1,2,3].map((n)=><div key={n} className="flex flex-1 items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${step>=n?'border-[#c6a15b] bg-[#c6a15b] text-black':'border-white/20 text-[#999]'}`}>{n}</span><span className={`hidden text-[9px] tracking-widest sm:block ${step>=n?'text-[#c6a15b]':'text-[#777]'}`}>{['SERVICES & TIME','YOUR DETAILS','CONFIRM'][n-1]}</span>{n!==3&&<span className="h-px flex-1 bg-white/10"/>}</div>)}</div>
      {step===1&&<div>
        <p className="eyebrow">STEP 01</p><h2 className="serif mt-3 text-3xl">Choose your experience.</h2>
        <p className="mt-2 text-sm text-[#999]">Browse by category and select all the services you need.</p>
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
      </div>}
      {step===2&&<div><p className="eyebrow">STEP 02</p><h2 className="serif mt-3 text-3xl">A few details.</h2><div className="mt-7 grid gap-5 sm:grid-cols-2">{([['customerName','Full name','text'],['phone','Mobile number','tel'],['email','Email (optional)','email']] as const).map(([key,label,type])=><label key={key} className="block"><span className="eyebrow">{label}</span><input className={`${inputClass} mt-2`} type={type} required={key!=='email'} value={details[key]} onChange={(e)=>setDetails({...details,[key]:e.target.value})}/></label>)}</div><label className="mt-5 block"><span className="eyebrow">NOTES (OPTIONAL)</span><textarea className={`${inputClass} mt-2`} rows={3} maxLength={500} value={details.notes} onChange={(e)=>setDetails({...details,notes:e.target.value})} placeholder="Anything your barber should know?"/></label><div className="mt-8 flex justify-between"><button onClick={()=>setStep(1)} className="outline-gold inline-flex items-center gap-2 px-5 py-3 text-[10px] tracking-widest"><ChevronLeft size={15}/> BACK</button><button disabled={!details.customerName.trim()||!/^((\+?8801|01)[3-9]\d{8})$/.test(details.phone.replace(/[\s-]/g,''))} onClick={()=>setStep(3)} className="gold-button px-6 py-3 text-[10px] tracking-widest disabled:opacity-40">REVIEW BOOKING</button></div></div>}
      {step===3&&<div><p className="eyebrow">STEP 03</p><h2 className="serif mt-3 text-3xl">Review your visit.</h2><div className="mt-7 space-y-4 border-y border-white/10 py-6 text-sm"><div><p className="text-[#999]">Selected services</p><ul className="mt-2 space-y-2">{selectedServices.map((service)=><li key={service._id} className="flex justify-between gap-4"><span>{service.name}</span><span className="shrink-0 text-[#c6a15b]">৳{Number(service.price||0).toLocaleString('en-BD')}</span></li>)}</ul></div><p className="flex justify-between gap-4"><span className="text-[#999]">Barber</span><span>{staffId==='any'?'Any available':barbers.find(b=>b._id===staffId)?.name}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Date & time</span><span>{date} · {time}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Name</span><span>{details.customerName}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Phone</span><span>{details.phone}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Total duration</span><span>{totalDuration} minutes</span></p><p className="flex justify-between gap-4 border-t border-white/10 pt-4 text-base"><span>Estimated total</span><span className="text-[#c6a15b]">৳{totalPrice.toLocaleString('en-BD')}</span></p></div><p className="mt-4 text-xs leading-6 text-[#999]">Your appointment is a request until the salon confirms it. Payment is not collected online at this stage.</p><div className="mt-8 flex justify-between"><button onClick={()=>setStep(2)} className="outline-gold px-5 py-3 text-[10px] tracking-widest">EDIT DETAILS</button><button disabled={submitting} onClick={submit} className="gold-button inline-flex items-center gap-2 px-6 py-3 text-[10px] tracking-widest disabled:opacity-50">{submitting?<LoaderCircle size={14} className="animate-spin"/>:'CONFIRM REQUEST'}</button></div></div>}
      {error&&<p role="alert" className="mt-6 border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</p>}
    </div>
    <aside className="h-fit border border-white/10 bg-[#141414] p-6"><p className="eyebrow">YOUR APPOINTMENT</p><h3 className="serif mt-3 text-2xl">A moment for you.</h3><p className="mt-4 text-sm leading-7 text-[#999]">Take a seat, slow down and leave the details to us.</p><div className="mt-7 space-y-4 border-t border-white/10 pt-5 text-xs text-[#aaa]"><p className="flex items-center gap-3"><Clock3 size={15} className="text-[#c6a15b]"/>Times shown in Bangladesh time</p><p>Booking requests are confirmed by the salon. No online payment is required.</p></div></aside>
  </div>;
}
