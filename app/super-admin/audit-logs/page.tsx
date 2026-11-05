import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SuperAdminAuditLogsPage() {
  let logs: { action: string; entityName: string; entityId: string; previousStatus: string; newStatus: string; actorEmail: string; createdAt: Date | string }[] = [];
  let failed = false;
  try {
    const db = await getDb();
    const records = await db.collection('platformAuditLogs').find({}).sort({ createdAt: -1 }).limit(100).toArray();
    logs = records.map((record) => ({
      action: String(record.action || 'PLATFORM_ACTION'),
      entityName: String(record.entityName || 'Unknown entity'),
      entityId: String(record.entityId || ''),
      previousStatus: String(record.previousStatus || '—'),
      newStatus: String(record.newStatus || '—'),
      actorEmail: String(record.actorEmail || record.actorId || 'Unknown actor'),
      createdAt: record.createdAt instanceof Date ? record.createdAt : String(record.createdAt || ''),
    }));
  } catch (error) {
    failed = true;
    console.error('super_admin_audit_logs_failed', error);
  }

  return <div>
    <p className="eyebrow">SECURITY & GOVERNANCE</p><h2 className="serif mt-2 text-3xl">Platform audit log.</h2>
    <p className="mt-3 text-sm text-[#999]">Latest 100 recorded platform-level actions. Entries are written by protected server-side operations.</p>
    {failed ? <p role="alert" className="mt-6 border border-red-900/60 p-5 text-sm text-red-200">Could not load audit logs. Check the database connection.</p> : logs.length ? (
      <div className="mt-7 overflow-x-auto border border-white/10">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-[#171717] text-[10px] tracking-widest text-[#c6a15b]"><tr><th className="px-5 py-4">ACTION</th><th className="px-5 py-4">ENTITY</th><th className="px-5 py-4">STATUS CHANGE</th><th className="px-5 py-4">ACTOR</th><th className="px-5 py-4">TIME</th></tr></thead>
          <tbody>{logs.map((log, index) => <tr key={`${log.entityId}-${index}`} className="border-t border-white/10 align-top"><td className="px-5 py-4 text-xs text-[#c6a15b]">{log.action}</td><td className="px-5 py-4"><p className="text-sm">{log.entityName}</p><p className="mt-1 text-[10px] text-[#777]">{log.entityId}</p></td><td className="px-5 py-4 text-xs text-[#aaa]">{log.previousStatus} → {log.newStatus}</td><td className="px-5 py-4 text-xs text-[#aaa]">{log.actorEmail}</td><td className="px-5 py-4 text-xs text-[#999]">{log.createdAt ? (log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt)).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }) : '—'}</td></tr>)}</tbody>
        </table>
      </div>
    ) : <p className="mt-6 border border-white/10 bg-[#171717] p-6 text-sm text-[#999]">No platform audit events have been recorded yet.</p>}
  </div>;
}
