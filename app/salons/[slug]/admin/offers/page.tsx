import { ResourceTable } from '@/components/admin/resource-table';
export default function SalonOffersPage({ params }: { params: { slug: string } }) { return <ResourceTable resource="offers" salonSlug={params.slug} />; }
