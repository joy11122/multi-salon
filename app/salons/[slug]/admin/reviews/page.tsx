import { ResourceTable } from '@/components/admin/resource-table';
export default function SalonReviewsPage({ params }: { params: { slug: string } }) { return <ResourceTable resource="reviews" salonSlug={params.slug} />; }
