import type { Document } from 'mongodb';
import { ContactForm } from '@/components/contact-form';
import { getDb } from '@/lib/db/client';

type SalonSettings = Document & {
  _id: string;
  phone?: string;
  address?: string;
  openingHours?: { open: string; close: string; closed: boolean }[];
};

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contact | The Gentlemen’s Club' };

export default async function ContactPage() {
  let settings: SalonSettings | null = null;
  try {
    settings = await (await getDb())
      .collection<SalonSettings>('settings')
      .findOne({ _id: 'salon' });
  } catch (error) {
    console.error('Failed to load salon contact settings:', error);
  }

  return (
    <main className="px-5 py-20 md:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">FIND US</p>
        <h1 className="serif mt-4 text-5xl md:text-6xl">
          Let’s talk <span className="gold italic">grooming.</span>
        </h1>
        <div className="mt-12 grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-8">
            <div>
              <p className="eyebrow">LOCATION</p>
              <p className="mt-3 text-sm leading-7 text-[#aaa]">
                {settings?.address || 'Khulna, Bangladesh. Exact street address to be confirmed.'}
              </p>
            </div>
            <div>
              <p className="eyebrow">PHONE</p>
              <p className="mt-3 text-sm text-[#aaa]">
                {settings?.phone || 'Phone number to be confirmed.'}
              </p>
            </div>
            <div>
              <p className="eyebrow">OPENING HOURS · DHAKA TIME</p>
              <div className="mt-3 space-y-2 text-sm text-[#aaa]">
                {(settings?.openingHours || []).length === 7 ? (
                  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => {
                    const hours = settings?.openingHours?.[i];
                    return (
                      <p key={day} className="flex justify-between gap-4">
                        <span>{day}</span>
                        <span>{hours?.closed ? 'Closed' : hours ? `${hours.open} – ${hours.close}` : 'Hours unavailable'}</span>
                      </p>
                    );
                  })
                ) : (
                  <p>Please contact the salon for current opening hours.</p>
                )}
              </div>
            </div>
            <p className="text-xs leading-6 text-[#777]">
              Contact information is displayed only after it has been entered in the admin settings.
            </p>
          </div>
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
