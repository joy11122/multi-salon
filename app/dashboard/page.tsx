import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { SALON_ID, money } from '@/lib/utils';

type Appointment={_id:unknown;bookingRef:string;serviceName:string;staffName:string;startAt:Date;price:number;status:string;paymentStatus:string};
export default async function DashboardPage(){
  const session=await auth();
  if(!session?.user)redirect('/login');
  if(session.user.role==='ADMIN')redirect('/admin');
  if(session.user.role==='STAFF')redirect('/staff');
  let appointments:Appointment[]=[];
  try { if(session.user.email) appointments=await(await getDb()).collection('appointments').find({salonId:SALON_ID,email:session.user.email.toLowerCase()}).sort({startAt:-1}).limit(30).toArray() as Appointment[]; } catch { /* Account page remains usable during initial database setup. */ }
  return <main className="min-h-screen px-5 py-16 md:px-10"><div className="mx-auto max-w-5xl"><p className="eyebrow">YOUR ACCOUNT</p><h1 className="serif mt-3 text-4xl">Welcome, {session.user.name?.split(' ')[0]||'gentleman'}.</h1><p className="mt-3 text-sm text-[#999]">Your appointment requests and visit history.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/booking" className="gold-button px-6 py-4 text-[10px] tracking-widest">BOOK A VISIT</Link><Link href="/services" className="outline-gold px-6 py-4 text-[10px] tracking-widest">EXPLORE SERVICES</Link><form action={async()=>{ 'use server'; await signOut({redirectTo:'/'}); }}><button className="outline-gold px-6 py-4 text-[10px] tracking-widest">SIGN OUT</button></form></div><div className="mt-12"><p className="eyebrow">APPOINTMENT HISTORY</p><h2 className="serif mt-2 text-2xl">Your visits.</h2><div className="mt-5 space-y-3">{appointments.length?appointments.map((a)=><article key={String(a._id)} className="grid gap-4 border border-white/10 bg-[#151515] p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-[10px] tracking-widest text-[#c6a15b]">{a.bookingRef}</p><h3 className="serif mt-2 text-xl">{a.serviceName}</h3><p className="mt-2 text-xs text-[#999]">{new Date(a.startAt).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})} · {a.staffName}</p></div><div className="text-left sm:text-right"><p className="text-sm text-[#eee]">{money(a.price)}</p><p className="mt-2 text-[10px] tracking-widest text-[#c6a15b]">{a.status} · {a.paymentStatus}</p></div></article>):<div className="border border-white/10 bg-[#151515] p-7"><p className="text-sm text-[#999]">No appointments are linked to this email yet. When booking, use your account email to see the visit here.</p><Link href="/booking" className="mt-5 inline-block text-xs text-[#c6a15b] underline">Make your first booking</Link></div>}</div></div></div></main>;
}
