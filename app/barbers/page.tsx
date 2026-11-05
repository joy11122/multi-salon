import type { Metadata } from 'next';
import { BarbersDirectory } from '@/components/barbers-directory';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Meet Our Barbers | Multi-Salon',
  description: 'Discover barbers and grooming professionals from active salons and book your next appointment.',
};

export default function BarbersPage() {
  return <BarbersDirectory />;
}
