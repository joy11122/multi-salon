'use client';
import { useEffect, useState } from "react";
type EventItem={_id:string;route:string;severity:string;message:string;createdAt:string;method?:string};
export function MonitoringClient({salonSlug}:{salonSlug:string}) {
 const [items,setItems]=useState<EventItem[]>([]),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/admin/monitoring?salonSlug="+encodeURIComponent(salonSlug),{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setItems(d.items||[]);}).catch(e=>setError(e.message));},[salonSlug]);
 return <div className="max-w-5xl"><p className="eyebrow">OPERATIONS & RELIABILITY</p><h2 className="serif mt-2 text-3xl">Monitoring events</h2><p className="mt-2 text-sm text-[#999]">Recent application errors recorded for this salon. Configure ALERT_WEBHOOK_URL for external alerts and poll /api/health with your uptime monitor.</p>{error&&<p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}<div className="mt-6 border border-white/10 bg-[#151515] p-5">{items.length?items.map(x=><article key={x._id} className="border-b border-white/10 py-4 last:border-0"><div className="flex flex-wrap justify-between gap-2"><span className="text-xs text-[#c6a15b]">{x.severity.toUpperCase()} · {x.method||"APP"} {x.route}</span><time className="text-xs text-[#888]">{new Date(x.createdAt).toLocaleString("en-BD",{timeZone:"Asia/Dhaka"})}</time></div><p className="mt-2 break-words text-sm text-[#ddd]">{x.message}</p></article>):<p className="text-sm text-[#999]">No monitoring events recorded.</p>}</div></div>;
}
