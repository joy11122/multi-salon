import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';

const links = [
  ['Overview', '/admin'],
  ['Appointments', '/admin/appointments'],
  ['Services', '/admin/services'],
  ['Staff', '/admin/staff'],
  ['Customers', '/admin/customers'],
  ['Payments', '/admin/payments'],
  ['Notifications', '/admin/notifications'],
  ['Offers', '/admin/offers'],
  ['Reviews', '/admin/reviews'],
  ['Reports', '/admin/reports'],
  ['Settings', '/admin/settings'],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-6 text-[#f5f1e8] sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">THE GENTLEMEN’S CLUB</p>
            <h1 className="serif mt-2 text-3xl sm:text-4xl">Management</h1>
            <p className="mt-2 text-xs text-[#999]">Salon workspace · Administration</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="max-w-full truncate text-xs text-[#999]">{session.user.email}</span>
            <Link href="/dashboard/salons" className="text-xs text-[#c6a15b] transition-colors hover:text-[#d8b875]">Your salons</Link>
            <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}>
              <button className="min-h-10 rounded-sm border border-white/10 px-3 text-xs text-[#c6a15b] transition-colors hover:border-[#c6a15b]/50 hover:bg-[#c6a15b]/[0.06]">Sign out</button>
            </form>
          </div>
        </header>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-7">
          <div className="min-w-0">
            <p className="mb-3 hidden px-1 text-[10px] uppercase tracking-[.2em] text-[#8f8779] lg:block">Workspace navigation</p>
            <nav aria-label="Admin workspace navigation" className="workspace-nav flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:pb-0">
              {links.map(([label, href]) => (
                <Link key={href} href={href} className="workspace-nav-link whitespace-nowrap">{label}</Link>
              ))}
            </nav>
          </div>
          <section className="workspace-panel min-w-0 rounded-sm">{children}</section>
        </div>
      </div>
    </main>
  );
}
