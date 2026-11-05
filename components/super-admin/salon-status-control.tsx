'use client';

import { useState } from 'react';

type Props = { salonId: string; status: string; salonName: string };

export function SalonStatusControl({ salonId, status: initialStatus, salonName }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function updateStatus() {
    const nextStatus = status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const confirmed = window.confirm(nextStatus === 'SUSPENDED'
      ? `Suspend ${salonName}? Its public booking availability will depend on active-salon filters.`
      : `Reactivate ${salonName}?`);
    if (!confirmed || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/super-admin/salons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId, status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update salon.');
      setStatus(nextStatus);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update salon.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="flex flex-col items-start gap-2">
    <span className={status === 'ACTIVE' ? 'text-xs text-[#c6a15b]' : 'text-xs text-red-300'}>{status}</span>
    <button type="button" disabled={saving} onClick={updateStatus} className="outline-gold px-3 py-2 text-[10px] tracking-wider disabled:opacity-50">
      {saving ? 'SAVING…' : status === 'SUSPENDED' ? 'REACTIVATE' : 'SUSPEND'}
    </button>
    {error && <span role="alert" className="max-w-40 text-xs text-red-300">{error}</span>}
  </div>;
}
