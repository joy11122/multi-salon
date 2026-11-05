import type { Metadata } from 'next';
import { ServicesDirectory } from '@/components/services-directory';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Explore Salon Services',
  description: 'Explore services, prices and appointment durations from active salons. Find a service and book directly with your preferred salon.',
};

export default function ServicesPage() {
  return <ServicesDirectory />;
}
