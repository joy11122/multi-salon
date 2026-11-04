import SettingsPage from '@/app/admin/settings/page';
export default function SalonSettingsPage({ params }: { params: { slug: string } }) { return <SettingsPage salonSlug={params.slug} />; }
