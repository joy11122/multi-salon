'use client';
import Link from 'next/link';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Menu, X } from 'lucide-react';

const links = [{href:'/',label:'Home'},{href:'/services',label:'Services'},{href:'/salons',label:'Find a Salon'},{href:'/barbers',label:'Our Barbers'},{href:'/gallery',label:'Gallery'},{href:'/about',label:'Our Story'},{href:'/contact',label:'Contact'}];

type Props = { userName?: string | null; dashboardHref?: string | null };
export function SiteHeader({ userName, dashboardHref }: Props) {
  const [open,setOpen]=useState(false);
  const signedIn = Boolean(dashboardHref);
  const accountHref = dashboardHref || '/login';
  return <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0b0b]/95 backdrop-blur">
    <div className="mx-auto flex min-h-[82px] max-w-[1440px] items-center justify-between gap-4 px-6 md:px-12">
      <Link href="/" className="flex shrink-0 items-center gap-3"><span className="serif flex h-10 w-10 items-center justify-center border border-[#c6a15b] text-xl text-[#c6a15b]">G</span><span><span className="serif block text-[15px] tracking-[.18em]">THE GENTLEMEN&apos;S CLUB</span><span className="mt-1 block text-[8px] tracking-[.32em] text-[#c6a15b]">GROOMING · KHULNA</span></span></Link>
      <nav className="hidden items-center gap-8 lg:flex">{links.map(l=><Link className="nav-link" key={l.href} href={l.href}>{l.label}</Link>)}</nav>
      <div className="hidden items-center gap-4 lg:flex">
        {signedIn ? <><Link href={accountHref} className="nav-link max-w-[150px] truncate" title={userName || 'My account'}>{userName || 'MY ACCOUNT'}</Link><button type="button" onClick={()=>signOut({callbackUrl:'/'})} className="nav-link">SIGN OUT</button></> : <Link href="/login" className="nav-link">SIGN IN</Link>}
        <Link href="/booking" className="gold-button px-6 py-3 text-[10px] font-semibold tracking-[.2em]">BOOK AN APPOINTMENT</Link>
      </div>
      <button aria-expanded={open} aria-controls="mobile-navigation" aria-label={open?'Close menu':'Open menu'} className="text-[#c6a15b] lg:hidden" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
    </div>
    {open&&<nav id="mobile-navigation" className="grid gap-5 border-t border-white/10 bg-[#111] px-6 py-6 lg:hidden">
      {links.map(l=><Link onClick={()=>setOpen(false)} className="nav-link" key={l.href} href={l.href}>{l.label}</Link>)}
      {signedIn ? <><Link onClick={()=>setOpen(false)} href={accountHref} className="nav-link">{userName || 'MY ACCOUNT'}</Link><button type="button" onClick={()=>signOut({callbackUrl:'/'})} className="nav-link text-left">SIGN OUT</button></> : <Link onClick={()=>setOpen(false)} href="/login" className="nav-link">SIGN IN</Link>}
      <Link onClick={()=>setOpen(false)} href="/booking" className="gold-button w-fit px-5 py-3 text-xs tracking-widest">BOOK NOW</Link>
    </nav>}
  </header>;
}
