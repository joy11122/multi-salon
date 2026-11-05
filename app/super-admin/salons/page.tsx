import { getDb } from '@/lib/db/client';
import { SalonStatusControl } from '@/components/super-admin/salon-status-control';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SuperAdminSalonsPage() {
  let salons: { salonId: string; name: string; slug: string; status: string; address?: string; createdAt?: Date | string }[] = [];
  let failed = false;
  try {
    const db = await getDb();
    const records = await db.collection('salons').find({}).project({ salonId: 1, name: 1, slug: 1, status: 1, address: 1, createdAt: 1 }).sort({ createdAt: -1 }).toArray();
    salons = records.map((salon) => ({ salonId: String(salon.salonId || salon._id), name: String(salon.name || 'Unnamed salon'), slug: String(salon.slug || ''), status: String(salon.status || 'UNKNOWN'), address: salon.address ? String(salon.address) : '', createdAt: salon.createdAt as Date | string | undefined }));
  } catch (error) {
    failed = true;
    console.error('super_admin_salons_list_failed', error);
  }

  return <div>
    <p className="eyebrow">SALON DIRECTORY</p><h2 className="serif mt-2 text-3xl">All salons.</h2>
    <p className="mt-3 text-sm text-[#999]">Platform-wide directory. Status actions are restricted to Super Admin and written to the audit log.</p>
    {failed ? <p role="alert" className="mt-6 border border-red-900/60 p-5 text-sm text-red-200">Could not load salons. Check the database connection.</p> : salons.length ? (
      <div className="mt-7 overflow-x-auto border border-white/10">
        <table className="w-full min-w-[680px] text-left">
          <thead className="bg-[#171717] text-[10px] tracking-widest text-[#c6a15b]"><tr><th className="px-5 py-4">SALON</th><th className="px-5 py-4">LOCATION</th><th className="px-5 py-4">SLUG</th><th className="px-5 py-4">STATUS / ACTION</th></tr></thead>
          <tbody>{salons.map((salon) => <tr key={salon.salonId} className="border-t border-white/10 align-top"><td className="px-5 py-5"><p className="serif text-lg">{salon.name}</p><p className="mt-1 text-[10px] text-[#777]">{salon.salonId}</p></td><td className="px-5 py-5 text-xs text-[#aaa]">{salon.address || '—'}</td><td className="px-5 py-5 text-xs text-[#aaa]">{salon.slug || '—'}</td><td className="px-5 py-5"><SalonStatusControl salonId={salon.salonId} status={salon.status} salonName={salon.name}/></td></tr>)}</tbody>
        </table>
      </div>
    ) : <p className="mt-6 border border-white/10 bg-[#171717] p-6 text-sm text-[#999]">No salon records found.</p>}
  </div>;
}
