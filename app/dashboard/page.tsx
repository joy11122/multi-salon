import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { SALON_ID, money } from '@/lib/utils';

type Appointment={_id:unknown;bookingRef:string;serviceName:string;staffName:string;startAt:Date;endAt:Date;price:number;durationMinutes:number;status:string;paymentStatus:string;phone?:string;email?:string;notes?:string};
export const dynamic = 'force-dynamic';

export default async function DashboardPage(){
  const session=await auth();
  if(!session?.user)redirect('/login');
  if(session.user.role==='ADMIN')redirect('/admin');
  if(session.user.role==='STAFF')redirect('/staff');
  const email=String(session.user.email||'').trim().toLowerCase();
  let appointments:Appointment[]=[];
  let loadError=false;
  try {
    if(email) appointments=await(await getDb()).collection('appointments').find({salonId:SALON_ID,email}).sort({startAt:-1}).limit(100).toArray() as Appointment[];
  } catch(error) { console.error('customer_dashboard_appointments_failed',error); loadError=true; }
  return <main className="min-h-screen px-5 py-12 md:px-10 md:py-16"><div className="mx-auto max-w-5xl">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="eyebrow">YOUR ACCOUNT</p><h1 className="serif mt-3 text-4xl">Welcome, {session.user.name?.split(' ')[0]||'gentleman'}.</h1><p className="mt-3 text-sm text-[#999]">Manage your appointments and view your visit history.</p><p className="mt-2 text-xs text-[#777]">{email}</p></div><form action={async()=>{ 'use server'; await signOut({redirectTo:'/'}); }}><button className="outline-gold px-6 py-3 text-[10px] tracking-widest">SIGN OUT</button></form></div>
    <div className="mt-8 flex flex-wrap gap-3"><Link href="/booking" className="gold-button px-6 py-4 text-[10px] tracking-widest">BOOK A VISIT</Link><Link href="/services" className="outline-gold px-6 py-4 text-[10px] tracking-widest">EXPLORE SERVICES</Link></div>
    <section className="mt-12"><p className="eyebrow">APPOINTMENT HISTORY</p><h2 className="serif mt-2 text-2xl">Your visits</h2>
      {loadError ? <div role="alert" className="mt-5 border border-red-500/30 bg-[#151515] p-6 text-sm text-red-200">We could not load your appointments right now. Please refresh this page in a moment.</div> : appointments.length ? <div className="mt-5 space-y-4">{appointments.map(a=><article key={String(a._id)} className="grid gap-5 border border-white/10 bg-[#151515] p-5 md:grid-cols-[1fr_auto] md:p-6"><div><div className="flex flex-wrap items-center gap-3"><p className="text-[10px] tracking-widest text-[#c6a15b]">BOOKING {a.bookingRef}</p><span className="border border-white/15 px-2 py-1 text-[9px] tracking-wider text-[#ddd]">{a.status}</span></div><h3 className="serif mt-3 text-2xl">{a.serviceName}</h3><p className="mt-2 text-sm text-[#aaa]">Barber: {a.staffName}</p><p className="mt-1 text-sm text-[#aaa]">{new Date(a.startAt).toLocaleString('en-BD',{timeZone:'Asia/Dhaka',dateStyle:'full',timeStyle:'short'})}</p><p className="mt-1 text-xs text-[#777]">{a.durationMinutes} minutes · {a.phone||'Phone not available'}</p>{a.notes&&<p className="mt-3 text-sm text-[#999]">Note: {a.notes}</p>}</div><div className="flex flex-row items-center justify-between gap-5 border-t border-white/10 pt-4 md:min-w-[150px] md:flex-col md:items-end md:justify-center md:border-l md:border-t-0 md:pl-5 md:pt-0"><div className="md:text-right"><p className="text-lg text-[#eee]">{money(a.price)}</p><p className="mt-2 text-[10px] tracking-widest text-[#c6a15b]">PAYMENT: {a.paymentStatus}</p></div><p className="text-[10px] text-[#888]">Ref: {a.bookingRef}</p></div></article>)}</div> : <div className="mt-5 border border-white/10 bg-[#151515] p-7"><h3 className="serif text-xl">No appointments found</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-[#999]">Bookings made using this account email will appear here. If you booked before creating an account, make sure the email used on that booking matches this login email.</p><Link href="/booking" className="mt-5 inline-block text-xs text-[#c6a15b] underline">Make your first booking</Link></div>}
    </section>
  </div></main>;
}
