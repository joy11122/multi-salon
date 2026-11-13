import { RefundsClient } from "@/components/admin/refunds-client";
export default function SalonRefundsPage({ params }: { params: { slug: string } }) { return <RefundsClient salonSlug={params.slug} />; }
