'use client';

import Link from 'next/link';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { ChevronDown, Menu, X, UserRound, Scissors, CalendarDays, LayoutDashboard, LogOut, Store } from 'lucide-react';

const primaryLinks = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/salons', label: 'Find a Salon' },
  { href: '/barbers', label: 'Barbers' },
  { href: '/gallery', label: 'Gallery' },
];

const moreLinks = [
  { href: '/about', label: 'Our Story' },
  { href: '/contact', label: 'Contact' },
  { href: '/dashboard/salons', label: 'For Salon Owners' },
];

type Props = {
  userName?: string | null;
  dashboardHref?: string | null;
};

export function SiteHeader({ userName, dashboardHref }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const signedIn = Boolean(dashboardHref);
  const accountHref = dashboardHref || '/login';
  const initial = userName?.trim().charAt(0).toUpperCase() || 'G';

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#c6a15b]/20 bg-[#0b0b0b]/95 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[88px] max-w-[1480px] items-center justify-between gap-5 px-5 sm:px-8 xl:px-12">
        <Link
          href="/"
          aria-label="The Gentlemen's Club home"
          className="group flex min-w-0 shrink-0 items-center gap-3"
          onClick={closeMobile}
        >
          <span className="serif flex h-11 w-11 items-center justify-center border border-[#c6a15b]/80 text-[25px] leading-none text-[#c6a15b] transition-colors duration-300 group-hover:bg-[#c6a15b] group-hover:text-[#0b0b0b]">
            G
          </span>
          <span className="min-w-0">
            <span className="serif block whitespace-nowrap text-[13px] tracking-[.15em] text-[#f5f1e8] sm:text-[15px] sm:tracking-[.18em]">
              THE GENTLEMEN&apos;S CLUB
            </span>
            <span className="mt-1 block text-[8px] tracking-[.34em] text-[#c6a15b]">
              GROOMING · KHULNA
            </span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-5 xl:flex 2xl:gap-7">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link whitespace-nowrap transition-colors duration-200 hover:text-[#c6a15b]">
              {link.label}
            </Link>
          ))}
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 nav-link whitespace-nowrap transition-colors duration-200 hover:text-[#c6a15b] [&::-webkit-details-marker]:hidden">
              More
              <ChevronDown size={13} className="transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-5 min-w-[210px] border border-[#c6a15b]/25 bg-[#111111] p-2 shadow-2xl shadow-black/50">
              {moreLinks.map((link) => (
                <Link key={link.href} href={link.href} className="block px-4 py-3 text-[10px] uppercase tracking-[.16em] text-[#d8d2c6] transition-colors hover:bg-[#c6a15b]/10 hover:text-[#c6a15b]">
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="hidden shrink-0 items-center gap-4 xl:flex">
          <details className="group relative">
            <summary
              aria-label={signedIn ? 'Open account menu' : 'Sign in'}
              className="flex cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6a15b]/60 bg-[#171717] text-[#c6a15b] transition-colors group-hover:bg-[#c6a15b] group-hover:text-[#0b0b0b]">
                {signedIn ? <span className="serif text-sm">{initial}</span> : <UserRound size={16} />}
              </span>
              <span className="max-w-[100px] truncate text-[9px] font-medium uppercase tracking-[.16em] text-[#e8e1d4]">
                {signedIn ? 'Account' : 'Sign In'}
              </span>
              <ChevronDown size={12} className="text-[#c6a15b] transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-5 min-w-[220px] border border-[#c6a15b]/25 bg-[#111111] p-2 shadow-2xl shadow-black/50">
              {signedIn ? (
                <>
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="serif text-base text-[#f5f1e8]">{userName || 'Welcome back'}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-[.16em] text-[#9a9284]">Your account</p>
                  </div>
                  <Link href={accountHref} className="flex items-center gap-3 px-4 py-3 text-[10px] uppercase tracking-[.14em] text-[#d8d2c6] transition-colors hover:bg-[#c6a15b]/10 hover:text-[#c6a15b]">
                    <LayoutDashboard size={14} /> My Dashboard
                  </Link>
                  <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-[10px] uppercase tracking-[.14em] text-[#d8d2c6] transition-colors hover:bg-[#c6a15b]/10 hover:text-[#c6a15b]">
                    <CalendarDays size={14} /> My Bookings
                  </Link>
                  <Link href="/dashboard/salons" className="flex items-center gap-3 px-4 py-3 text-[10px] uppercase tracking-[.14em] text-[#d8d2c6] transition-colors hover:bg-[#c6a15b]/10 hover:text-[#c6a15b]">
                    <Store size={14} /> My Salon Workspaces
                  </Link>
                  <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="flex w-full items-center gap-3 border-t border-white/10 px-4 py-3 text-left text-[10px] uppercase tracking-[.14em] text-[#d8d2c6] transition-colors hover:bg-[#c6a15b]/10 hover:text-[#c6a15b]">
                    <LogOut size={14} /> Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" className="flex items-center gap-3 px-4 py-3 text-[10px] uppercase tracking-[.14em] text-[#d8d2c6] transition-colors hover:bg-[#c6a15b]/10 hover:text-[#c6a15b]">
                  <UserRound size={14} /> Sign In to Your Account
                </Link>
              )}
            </div>
          </details>

          <Link href="/booking" className="gold-button whitespace-nowrap px-5 py-3.5 text-[9px] font-semibold tracking-[.17em] transition-all duration-300 hover:-translate-y-0.5 2xl:px-6">
            BOOK AN APPOINTMENT
          </Link>
        </div>

        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#c6a15b]/35 text-[#c6a15b] transition-colors hover:bg-[#c6a15b] hover:text-[#0b0b0b] xl:hidden"
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {mobileOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-[#c6a15b]/20 bg-[#101010] px-5 pb-7 pt-4 shadow-2xl shadow-black/40 xl:hidden sm:px-8">
          <div className="mx-auto grid max-w-[1480px] gap-1">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMobile} className="border-b border-white/[0.06] py-3 text-[11px] uppercase tracking-[.18em] text-[#e8e1d4] transition-colors hover:text-[#c6a15b]">
                {link.label}
              </Link>
            ))}
            <p className="pb-1 pt-4 text-[9px] uppercase tracking-[.24em] text-[#c6a15b]">Discover more</p>
            {moreLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMobile} className="py-2.5 text-[10px] uppercase tracking-[.16em] text-[#aaa397] transition-colors hover:text-[#c6a15b]">
                {link.label}
              </Link>
            ))}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
              {signedIn ? (
                <>
                  <Link href={accountHref} onClick={closeMobile} className="outline-gold flex items-center justify-center gap-2 px-3 py-3 text-[9px] tracking-[.12em]">
                    <LayoutDashboard size={14} /> Dashboard
                  </Link>
                  <Link href="/dashboard" onClick={closeMobile} className="outline-gold flex items-center justify-center gap-2 px-3 py-3 text-[9px] tracking-[.12em]">
                    <CalendarDays size={14} /> My Bookings
                  </Link>
                  <Link href="/dashboard/salons" onClick={closeMobile} className="outline-gold col-span-2 flex items-center justify-center gap-2 px-3 py-3 text-[9px] tracking-[.12em]">
                    <Scissors size={14} /> My Salon Workspaces
                  </Link>
                  <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="col-span-2 flex items-center justify-center gap-2 border border-white/10 px-3 py-3 text-[9px] tracking-[.16em] text-[#aaa397] transition-colors hover:border-[#c6a15b]/50 hover:text-[#c6a15b]">
                    <LogOut size={14} /> SIGN OUT
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={closeMobile} className="outline-gold col-span-2 flex items-center justify-center gap-2 px-3 py-3 text-[9px] tracking-[.16em]">
                  <UserRound size={14} /> SIGN IN
                </Link>
              )}
            </div>
            <Link href="/booking" onClick={closeMobile} className="gold-button mt-3 flex items-center justify-center gap-2 px-5 py-4 text-[10px] font-semibold tracking-[.2em]">
              BOOK AN APPOINTMENT
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
