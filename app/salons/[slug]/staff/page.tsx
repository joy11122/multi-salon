import AppointmentsPage from '@/app/admin/appointments/page';
export default function SalonStaffHome({ params }: { params: { slug: string } }) { return <AppointmentsPage salonSlug={params.slug} />; }
