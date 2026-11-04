import { AppointmentsClient } from '@/app/admin/appointments/page';
export default function SalonAppointmentsPage({ params }: { params: { slug: string } }) { return <AppointmentsClient salonSlug={params.slug} />; }
