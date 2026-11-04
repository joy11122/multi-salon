import { ResourceTable } from '@/components/admin/resource-table';
export default function SalonCustomersPage({ params }: { params: { slug: string } }) { return <ResourceTable resource="customers" salonSlug={params.slug} />; }
