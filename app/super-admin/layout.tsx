import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';

const links = [['Overview', '/super-admin'], ['Salons', '/super-admin/salons']];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'SUPER_ADMIN') redirect('/dashboard');

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-8 text-[#f5f1e8] md:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow">MULTI-SALON PLATFORM</p><h1 className="serif mt-2 text-3xl">Super Admin</h1><p className="mt-2 text-xs text-[#999]">Platform operations & governance</p></div>
          <div className="flex items-center gap-4"><span className="text-xs text-[#999]">{session.user.email}</span><form action={async () => { 'use server'; await signOut({ redirectTo: '/' }); }}><button className="text-xs text-[#c6a15b] hover:underline">Sign out</button></form></div>
        </header>
        <div className="grid gap-7 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Super Admin navigation" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {links.map(([label, href]) => <Link key={href} href={href} className="whitespace-nowrap border border-white/10 px-4 py-3 text-xs text-[#bbb] transition hover:border-[#c6a15b] hover:text-[#c6a15b]">{label}</Link>)}
            <Link href="/dashboard/salons" className="whitespace-nowrap border border-white/10 px-4 py-3 text-xs text-[#999] hover:border-[#c6a15b] hover:text-[#c6a15b]">My salon workspaces</Link>
          </nav>
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
