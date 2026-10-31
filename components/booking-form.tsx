'use client';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, LoaderCircle } from 'lucide-react';

type Service = { _id: string; name: string; description?: string; price: number; durationMinutes: number };
type Barber = { _id: string; name: string; title?: string };
type Slot = { time: string; staffId: string; staffName: string };
const inputClass = 'w-full border border-white/15 bg-[#101010] px-4 py-3 text-sm text-[#f5f1e8] outline-none transition focus:border-[#c6a15b]';

export function BookingForm({ defaultName = '', defaultEmail = '' }: { defaultName?: string; defaultEmail?: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [serviceId, setServiceId] = useState('');
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
  const selected = useMemo(() => services.find((item) => item._id === serviceId), [services, serviceId]);

  useEffect(() => {
    fetch('/api/booking').then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); setServices(data.services || []); setBarbers(data.staff || []); }).catch((e) => setError(e.message || 'Booking is unavailable.')).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!serviceId || !date) { setSlots([]); return; }
    setTime('');
    fetch(`/api/availability?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}&staffId=${encodeURIComponent(staffId)}`)
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); setSlots(data.slots || []); })
      .catch((e) => setError(e.message || 'Could not load times.'));
  }, [serviceId, staffId, date]);

  async function submit() {
    setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceId, staffId, date, time, ...details }) });
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
      <div className="mb-9 flex items-center gap-3">{[1,2,3].map((n)=><div key={n} className="flex flex-1 items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${step>=n?'border-[#c6a15b] bg-[#c6a15b] text-black':'border-white/20 text-[#999]'}`}>{n}</span><span className={`hidden text-[9px] tracking-widest sm:block ${step>=n?'text-[#c6a15b]':'text-[#777]'}`}>{['SERVICE & TIME','YOUR DETAILS','CONFIRM'][n-1]}</span>{n!==3&&<span className="h-px flex-1 bg-white/10"/>}</div>)}</div>
      {step===1&&<div><p className="eyebrow">STEP 01</p><h2 className="serif mt-3 text-3xl">Choose your experience.</h2>{!services.length&&<p className="mt-5 border border-[#c6a15b]/30 p-4 text-sm text-[#c6a15b]">The service menu is not configured yet. Please check back soon.</p>}{!barbers.length&&<p className="mt-3 border border-[#c6a15b]/30 p-4 text-sm text-[#c6a15b]">Online booking will open once the salon team has been added by the administrator.</p>}<div className="mt-7 grid gap-3">{services.map((service)=><button type="button" key={service._id} onClick={()=>setServiceId(service._id)} aria-pressed={serviceId===service._id} className={`flex items-center justify-between gap-4 border p-4 text-left transition ${serviceId===service._id?'border-[#c6a15b] bg-[#c6a15b]/5':'border-white/10 hover:border-white/30'}`}><span><span className="serif block text-lg">{service.name}</span><span className="mt-1 block text-xs text-[#999]">{service.durationMinutes} minutes · {service.description}</span></span><span className="text-sm text-[#c6a15b]">৳{service.price}</span></button>)}</div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="block"><span className="eyebrow">BARBER</span><select className={`${inputClass} mt-2`} value={staffId} onChange={(e)=>setStaffId(e.target.value)}><option value="any">Any available barber</option>{barbers.map((b)=><option key={b._id} value={b._id}>{b.name}{b.title?` · ${b.title}`:''}</option>)}</select></label><label className="block"><span className="eyebrow">DATE</span><input className={`${inputClass} mt-2`} type="date" min={new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)} value={date} onChange={(e)=>setDate(e.target.value)}/></label></div>
      {date&&<div className="mt-7"><p className="eyebrow">AVAILABLE TIMES</p><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map((slot)=><button type="button" key={`${slot.time}-${slot.staffId}`} onClick={()=>setTime(slot.time)} aria-pressed={time===slot.time} className={`border px-3 py-3 text-xs ${time===slot.time?'border-[#c6a15b] bg-[#c6a15b] text-black':'border-white/15 text-[#ddd] hover:border-[#c6a15b]'}`}>{slot.time}</button>)}</div>{!slots.length&&<p className="mt-3 text-sm text-[#999]">No available slots for this date. Try another day.</p>}</div>}
      <div className="mt-8 flex justify-end"><button disabled={!serviceId||!date||!time||!barbers.length} onClick={()=>setStep(2)} className="gold-button inline-flex items-center gap-2 px-6 py-3 text-[10px] tracking-widest disabled:cursor-not-allowed disabled:opacity-40">CONTINUE <ChevronRight size={15}/></button></div></div>}
      {step===2&&<div><p className="eyebrow">STEP 02</p><h2 className="serif mt-3 text-3xl">A few details.</h2><div className="mt-7 grid gap-5 sm:grid-cols-2">{([['customerName','Full name','text'],['phone','Mobile number','tel'],['email','Email (optional)','email']] as const).map(([key,label,type])=><label key={key} className="block"><span className="eyebrow">{label}</span><input className={`${inputClass} mt-2`} type={type} required={key!=='email'} value={details[key]} onChange={(e)=>setDetails({...details,[key]:e.target.value})}/></label>)}</div><label className="mt-5 block"><span className="eyebrow">NOTES (OPTIONAL)</span><textarea className={`${inputClass} mt-2`} rows={3} maxLength={500} value={details.notes} onChange={(e)=>setDetails({...details,notes:e.target.value})} placeholder="Anything your barber should know?"/></label><div className="mt-8 flex justify-between"><button onClick={()=>setStep(1)} className="outline-gold inline-flex items-center gap-2 px-5 py-3 text-[10px] tracking-widest"><ChevronLeft size={15}/> BACK</button><button disabled={!details.customerName.trim()||!/^((\+?8801|01)[3-9]\d{8})$/.test(details.phone.replace(/[\s-]/g,''))} onClick={()=>setStep(3)} className="gold-button px-6 py-3 text-[10px] tracking-widest disabled:opacity-40">REVIEW BOOKING</button></div></div>}
      {step===3&&<div><p className="eyebrow">STEP 03</p><h2 className="serif mt-3 text-3xl">Review your visit.</h2><div className="mt-7 space-y-4 border-y border-white/10 py-6 text-sm"><p className="flex justify-between gap-4"><span className="text-[#999]">Service</span><span>{selected?.name}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Barber</span><span>{staffId==='any'?'Any available':barbers.find(b=>b._id===staffId)?.name}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Date & time</span><span>{date} · {time}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Name</span><span>{details.customerName}</span></p><p className="flex justify-between gap-4"><span className="text-[#999]">Phone</span><span>{details.phone}</span></p><p className="flex justify-between gap-4 border-t border-white/10 pt-4 text-base"><span>Estimated total</span><span className="text-[#c6a15b]">৳{selected?.price}</span></p></div><p className="mt-4 text-xs leading-6 text-[#999]">Your appointment is a request until the salon confirms it. Payment is not collected online at this stage.</p><div className="mt-8 flex justify-between"><button onClick={()=>setStep(2)} className="outline-gold px-5 py-3 text-[10px] tracking-widest">EDIT DETAILS</button><button disabled={submitting} onClick={submit} className="gold-button inline-flex items-center gap-2 px-6 py-3 text-[10px] tracking-widest disabled:opacity-50">{submitting?<LoaderCircle size={14} className="animate-spin"/>:'CONFIRM REQUEST'}</button></div></div>}
      {error&&<p role="alert" className="mt-6 border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</p>}
    </div>
    <aside className="h-fit border border-white/10 bg-[#141414] p-6"><p className="eyebrow">YOUR APPOINTMENT</p><h3 className="serif mt-3 text-2xl">A moment for you.</h3><p className="mt-4 text-sm leading-7 text-[#999]">Take a seat, slow down and leave the details to us.</p><div className="mt-7 space-y-4 border-t border-white/10 pt-5 text-xs text-[#aaa]"><p className="flex items-center gap-3"><Clock3 size={15} className="text-[#c6a15b]"/>Times shown in Bangladesh time</p><p>Booking requests are confirmed by the salon. No online payment is required.</p></div></aside>
  </div>;
}
