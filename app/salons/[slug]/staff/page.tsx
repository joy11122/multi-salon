import { AppointmentsClient } from '@/components/admin/appointments-client';
export default function SalonStaffHome({ params }: { params: { slug: string } }) { return <AppointmentsClient salonSlug={params.slug} staffMode />; }
