import { MonitoringClient } from "@/components/admin/monitoring-client";
export default function MonitoringPage({params}:{params:{slug:string}}){return <MonitoringClient salonSlug={params.slug}/>;}
