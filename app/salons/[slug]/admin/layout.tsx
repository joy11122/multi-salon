import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { findActiveSalonBySlug, requireSalonMembership } from '@/lib/tenancy';

const sections = [
  ['Overview', ''],
  ['Appointments', '/appointments'],
  ['Services', '/services'],
  ['Staff', '/staff'],
  ['Staff shifts', '/shifts'],
  ['Media library', '/media'],
  ['Monitoring', '/monitoring'],
  ['Customers', '/customers'],
  ['Payments', '/payments'],
  ['Refunds', '/refunds'],
  ['Offers', '/offers'],
  ['Reviews', '/reviews'],
  ['Settings', '/settings'],
];

export default async function SalonAdminLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const salon = await findActiveSalonBySlug(params.slug);
  if (!salon) notFound();
  const access = await requireSalonMembership(session, String(salon.salonId), ['OWNER', 'ADMIN', 'MANAGER']);
  if ('response' in access) redirect('/dashboard/salons');

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">SALON WORKSPACE · {access.membership.role}</p>
            <h1 className="serif mt-2 text-3xl">{String(salon.name)}</h1>
            <p className="mt-2 text-xs text-[#888]">{session.user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/dashboard/salons" className="text-xs text-[#c6a15b] hover:underline">All salons</Link>
            <Link href={`/salons/${encodeURIComponent(params.slug)}`} className="text-xs text-[#c6a15b] hover:underline">Public profile</Link>
            <form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}>
              <button className="text-xs text-[#c6a15b] hover:underline">Sign out</button>
            </form>
          </div>
        </div>
        <div className="grid gap-7 lg:grid-cols-[220px_1fr]">
          <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {sections.map(([label, suffix]) => (
              <Link key={label} href={`/salons/${encodeURIComponent(params.slug)}/admin${suffix}`} className="whitespace-nowrap border border-white/10 px-4 py-3 text-xs text-[#bbb] transition hover:border-[#c6a15b] hover:text-[#c6a15b]">{label}</Link>
            ))}
          </nav>
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
