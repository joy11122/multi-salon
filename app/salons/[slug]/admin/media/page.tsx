import { ImageUploadClient } from "@/components/admin/image-upload-client";
export default function SalonMediaPage({ params }: { params: { slug: string } }) { return <ImageUploadClient salonSlug={params.slug} />; }
