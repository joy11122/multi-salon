import Link from 'next/link';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SuperAdminHome() {
  let stats = { salons: 0, activeSalons: 0, suspendedSalons: 0, users: 0, appointments: 0, staff: 0 };
  let databaseAvailable = true;
  try {
    const db = await getDb();
    const [salons, activeSalons, suspendedSalons, users, appointments, staff] = await Promise.all([
      db.collection('salons').countDocuments({}),
      db.collection('salons').countDocuments({ status: 'ACTIVE' }),
      db.collection('salons').countDocuments({ status: 'SUSPENDED' }),
      db.collection('users').countDocuments({}),
      db.collection('appointments').countDocuments({}),
      db.collection('staff').countDocuments({}),
    ]);
    stats = { salons, activeSalons, suspendedSalons, users, appointments, staff };
  } catch (error) {
    databaseAvailable = false;
    console.error('super_admin_overview_failed', error);
  }

  const cards = [['Total salons', stats.salons], ['Active salons', stats.activeSalons], ['Suspended salons', stats.suspendedSalons], ['Registered users', stats.users], ['All appointments', stats.appointments], ['Team records', stats.staff]];
  return <div>
    <p className="eyebrow">PLATFORM OVERVIEW</p>
    <h2 className="serif mt-2 text-3xl">Platform at a glance.</h2>
    <p className="mt-3 text-sm text-[#999]">Live aggregate counts across all salon workspaces. This is separate from any individual salon dashboard.</p>
    {!databaseAvailable && <p role="alert" className="mt-5 border border-red-900/60 bg-[#171010] p-4 text-sm text-red-200">Platform data could not be loaded. Check the database connection and server logs.</p>}
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value]) => <article key={String(label)} className="border border-white/10 bg-[#171717] p-6"><p className="text-xs text-[#999]">{label}</p><p className="serif mt-3 text-3xl text-[#c6a15b]">{value}</p></article>)}</div>
    <section className="mt-8 border border-white/10 bg-[#171717] p-6">
      <p className="eyebrow">PLATFORM OPERATIONS</p><h3 className="serif mt-2 text-2xl">Salon governance</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#999]">Review every registered salon, monitor its current status, and suspend or reactivate access when required. Every status change is recorded in the platform audit log.</p>
      <Link href="/super-admin/salons" className="outline-gold mt-5 inline-flex px-5 py-3 text-xs tracking-widest">MANAGE SALONS</Link>
    </section>
    <p className="mt-6 text-xs leading-6 text-[#777]">Subscription billing, commissions, refunds and revenue reporting are not enabled yet; no financial figures are estimated or fabricated in this overview.</p>
  </div>;
}
