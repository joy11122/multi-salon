import { StaffScheduleClient } from "@/components/admin/staff-schedule-client";
export default function StaffShiftsPage({ params }: { params: { slug: string } }) { return <StaffScheduleClient salonSlug={params.slug} />; }
