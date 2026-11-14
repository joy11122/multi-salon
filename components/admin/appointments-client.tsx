'use client';

import { useEffect, useState } from 'react';

type Appointment = {
  _id: string;
  bookingRef: string;
  customerName: string;
  phone: string;
  serviceName: string;
  staffName: string;
  startAt: string;
  price: number;
  status: string;
  paymentStatus: string;
};

function getContactLinks(appointment: Appointment) {
  const dialPhone = appointment.phone.replace(/[^\\d+]/g, '');
  const digits = appointment.phone.replace(/\\D/g, '');
  const whatsappPhone = appointment.phone.trim().startsWith('+')
    ? digits
    : digits.startsWith('00')
      ? digits.slice(2)
      : digits.startsWith('0')
        ? `88${digits.slice(1)}`
        : digits;
  const hasValidPhone = digits.length >= 8 && digits.length <= 15;
  const appointmentDate = new Date(appointment.startAt);
  const formattedDate = Number.isNaN(appointmentDate.getTime())
    ? appointment.startAt
    : appointmentDate.toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' });
  const message = `Hello ${appointment.customerName}, this is regarding your ${appointment.serviceName} appointment (Booking: ${appointment.bookingRef}) scheduled for ${formattedDate}. Please let us know if you need any assistance.`;
  const encodedMessage = encodeURIComponent(message);

  return {
    hasValidPhone,
    whatsappHref: `https://wa.me/${whatsappPhone}?text=${encodedMessage}`,
    smsHref: `sms:${dialPhone}?body=${encodedMessage}`,
    callHref: `tel:${dialPhone}`,
  };
}

export function AppointmentsClient({
  salonSlug,
  staffMode = false,
}: {
  salonSlug?: string;
  staffMode?: boolean;
} = {}) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const apiUrl = `/api/admin/appointments${salonSlug ? `?salonSlug=${encodeURIComponent(salonSlug)}` : ''}`;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${apiUrl}${date ? `${salonSlug ? '&' : '?'}date=${encodeURIComponent(date)}` : ''}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data.items || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load appointments.');
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void load();
  }, [date, salonSlug]);

  async function update(id: string, status: string) {
    try {
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not update appointment.');
        return;
      }
      await load();
    } catch {
      setError('Could not update appointment. Please try again.');
    }
  }

  return (
    <div>
      <p className="eyebrow">SCHEDULE & BOOKINGS</p>
      <h2 className="serif mt-2 text-3xl">Appointments</h2>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="text-[10px] tracking-widest text-[#c6a15b]">
          FILTER BY DATE
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="ml-3 border border-white/15 bg-[#151515] px-3 py-2 text-xs text-[#eee]"
          />
        </label>
        <button onClick={() => setDate('')} className="text-xs text-[#c6a15b] underline">
          Show all
        </button>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}

      <div className="mt-7 space-y-3">
        {loading ? (
          <p className="text-sm text-[#999]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="border border-white/10 p-6 text-sm text-[#999]">
            No appointments have been requested yet.
          </p>
        ) : (
          items.map((appointment) => {
            const contacts = getContactLinks(appointment);
            const statusActions =
              appointment.status === 'PENDING'
                ? staffMode
                  ? ['CONFIRMED']
                  : ['CONFIRMED', 'CANCELLED', 'REJECTED']
                : appointment.status === 'CONFIRMED'
                  ? staffMode
                    ? ['COMPLETED', 'NO_SHOW']
                    : ['COMPLETED', 'CANCELLED', 'NO_SHOW']
                  : [];

            return (
              <article
                key={appointment._id}
                className="grid gap-4 border border-white/10 bg-[#151515] p-5 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <p className="text-[10px] tracking-widest text-[#c6a15b]">
                    {appointment.bookingRef} · {appointment.status}
                  </p>
                  <h3 className="serif mt-2 text-xl">{appointment.customerName}</h3>
                  <p className="mt-2 text-xs text-[#999]">
                    {appointment.serviceName} · {appointment.staffName} ·{' '}
                    {new Date(appointment.startAt).toLocaleString('en-BD', {
                      timeZone: 'Asia/Dhaka',
                    })}
                  </p>
                  <p className="mt-1 text-xs text-[#999]">
                    {appointment.phone} · ৳{appointment.price} · Payment: {appointment.paymentStatus}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2" aria-label="Contact customer">
                    {contacts.hasValidPhone ? (
                      <>
                        <a
                          href={contacts.whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Message ${appointment.customerName} on WhatsApp`}
                          className="inline-flex min-h-10 items-center justify-center rounded-sm border border-[#25D366]/40 px-3 py-2 text-[10px] font-medium tracking-wide text-[#7ee2a0] transition hover:border-[#25D366] hover:bg-[#25D366]/10"
                        >
                          WhatsApp
                        </a>
                        <a
                          href={contacts.smsHref}
                          aria-label={`Send SMS to ${appointment.customerName}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-sm border border-white/15 px-3 py-2 text-[10px] font-medium tracking-wide text-[#ddd] transition hover:border-[#c6a15b] hover:text-[#c6a15b]"
                        >
                          SMS
                        </a>
                        <a
                          href={contacts.callHref}
                          aria-label={`Call ${appointment.customerName}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-sm border border-white/15 px-3 py-2 text-[10px] font-medium tracking-wide text-[#ddd] transition hover:border-[#c6a15b] hover:text-[#c6a15b]"
                        >
                          Call
                        </a>
                      </>
                    ) : (
                      <span className="text-xs text-[#999]">No valid customer phone number</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {statusActions.map((status) => (
                    <button
                      key={status}
                      onClick={() => void update(appointment._id, status)}
                      disabled={appointment.status === status}
                      className="min-h-10 border border-white/15 px-3 py-2 text-[9px] tracking-wider text-[#ccc] hover:border-[#c6a15b] disabled:opacity-30"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
