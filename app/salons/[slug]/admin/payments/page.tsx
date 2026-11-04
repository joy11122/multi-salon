import { ResourceTable } from '@/components/admin/resource-table';
export default function SalonPaymentsPage({ params }: { params: { slug: string } }) { return <ResourceTable resource="payments" salonSlug={params.slug} />; }
