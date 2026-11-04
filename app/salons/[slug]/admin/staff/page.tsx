import { ResourceTable } from '@/components/admin/resource-table';
export default function SalonStaffPage({ params }: { params: { slug: string } }) { return <ResourceTable resource="staff" salonSlug={params.slug} />; }
