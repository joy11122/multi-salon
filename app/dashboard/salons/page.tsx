import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { SalonWorkspace } from '@/components/salon-workspace';

export const dynamic = 'force-dynamic';

export default async function MySalonsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return <SalonWorkspace />;
}
