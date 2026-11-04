import { ResourceTable } from '@/components/admin/resource-table';
export default function SalonServicesPage({ params }: { params: { slug: string } }) { return <ResourceTable resource="services" salonSlug={params.slug} />; }
