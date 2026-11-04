import { SettingsClient } from '@/components/admin/settings-client';
export default function SalonSettingsPage({ params }: { params: { slug: string } }) { return <SettingsClient salonSlug={params.slug} />; }
