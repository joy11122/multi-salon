import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { findActiveSalonBySlug, requireSalonMembership } from '@/lib/tenancy';

export default async function SalonStaffLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const salon = await findActiveSalonBySlug(params.slug);
  if (!salon) notFound();
  const access = await requireSalonMembership(session, String(salon.salonId), ['STAFF']);
  if ('response' in access) redirect('/dashboard/salons');

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div><p className="eyebrow">STAFF WORKSPACE</p><h1 className="serif mt-2 text-3xl">{String(salon.name)}</h1><p className="mt-2 text-xs text-[#888]">{session.user.email}</p></div>
          <div className="flex gap-4"><Link href="/dashboard/salons" className="text-xs text-[#c6a15b] hover:underline">Your salons</Link><form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}><button className="text-xs text-[#c6a15b] hover:underline">Sign out</button></form></div>
        </header>
        {children}
      </div>
    </main>
  );
}
