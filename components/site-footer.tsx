import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { getDb } from '@/lib/db/client';

export async function SiteFooter(){
  noStore();
  let settings:{name?:string;phone?:string;address?:string}|null=null;
  try { settings=await(await getDb()).collection('settings').findOne({_id:'salon' as never}) as typeof settings; } catch { /* Public pages remain available while the database is being configured. */ }
  return <footer className="border-t border-white/10 bg-[#080808] px-6 py-14 md:px-12"><div className="mx-auto grid max-w-[1280px] gap-10 md:grid-cols-3"><div><div className="serif text-lg tracking-[.16em]">{settings?.name||"THE GENTLEMEN'S CLUB"}</div><p className="eyebrow mt-2">A higher standard of grooming</p><p className="mt-5 max-w-sm text-sm leading-7 text-[#a5a098]">A considered grooming experience for the modern gentleman. Precision, comfort and personal attention in Khulna.</p></div><div><p className="eyebrow">Explore</p><div className="mt-5 grid grid-cols-2 gap-3 text-sm text-[#c8c2b7]"><Link href="/services">Services</Link><Link href="/barbers">Our Barbers</Link><Link href="/gallery">Gallery</Link><Link href="/booking">Book a Visit</Link><Link href="/privacy">Privacy</Link></div></div><div><p className="eyebrow">Visit us</p><p className="mt-5 text-sm leading-7 text-[#c8c2b7]">{settings?.address||'Khulna, Bangladesh'}{settings?.phone&&<><br/><a href={`tel:${settings.phone}`} className="text-[#c6a15b]">{settings.phone}</a></>}</p><p className="mt-2 text-[10px] text-[#777]">Please confirm opening hours before visiting.</p></div></div><div className="mx-auto mt-12 max-w-[1280px] border-t border-white/10 pt-6 text-[10px] tracking-widest text-[#777]">© {new Date().getFullYear()} THE GENTLEMEN&apos;S CLUB. ALL RIGHTS RESERVED.</div></footer>;
}
