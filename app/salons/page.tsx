import { SalonDiscovery } from '@/components/salon-discovery';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Find a Salon | Multi-Salon',
  description: 'Find salons by city, area or your current location using free OpenStreetMap-powered discovery.',
};

export default function SalonDirectoryPage() {
  return (
    <main className="min-h-screen px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">DISCOVER LOCAL GROOMING</p>
        <h1 className="serif mt-4 text-5xl md:text-6xl">Find your salon.</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-[#999]">Find salons around you with GPS, or search any city and area. Your location is never stored by this search.</p>
        <SalonDiscovery />
      </div>
    </main>
  );
}
