'use client';

import { useState } from 'react';

export function CancelBookingButton({ bookingRef }: { bookingRef: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function cancelBooking() {
    if (busy || !window.confirm('Are you sure you want to cancel this appointment?')) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/booking/${encodeURIComponent(bookingRef)}/cancel`, { method: 'POST' });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setMessage(result.error || 'Cancellation failed. Please try again.');
        return;
      }
      window.location.reload();
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" onClick={cancelBooking} disabled={busy} className="border border-red-400/50 px-4 py-3 text-[10px] tracking-widest text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? 'CANCELLING…' : 'CANCEL BOOKING'}
      </button>
      {message ? <p role="alert" className="max-w-xs text-right text-xs text-red-300">{message}</p> : null}
    </div>
  );
}
