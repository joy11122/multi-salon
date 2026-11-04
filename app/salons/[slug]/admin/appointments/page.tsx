import { AppointmentsClient } from '@/components/admin/appointments-client';
export default function SalonAppointmentsPage({ params }: { params: { slug: string } }) { return <AppointmentsClient salonSlug={params.slug} />; }
