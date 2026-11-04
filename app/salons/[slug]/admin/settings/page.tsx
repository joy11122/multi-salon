import { SettingsClient } from '@/app/admin/settings/page';
export default function SalonSettingsPage({ params }: { params: { slug: string } }) { return <SettingsClient salonSlug={params.slug} />; }
