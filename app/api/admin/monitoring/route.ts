import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { findActiveSalonBySlug, requireSalonMembership } from "@/lib/tenancy";
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("salonSlug");
  if (!slug) return NextResponse.json({ error: "Salon context is required." }, { status: 400 });
  const salon = await findActiveSalonBySlug(slug);
  if (!salon) return NextResponse.json({ error: "Salon not found." }, { status: 404 });
  const access = await requireSalonMembership(await auth(), String(salon.salonId), ["OWNER", "ADMIN"]);
  if ("response" in access) return access.response;
  try {
    const items = await (await getDb()).collection("monitoringEvents").find({ $or: [{ salonId: String(salon.salonId) }, { salonId: { $exists: false } }] }).sort({ createdAt: -1 }).limit(100).toArray();
    return NextResponse.json({ items: items.map(x => ({ ...x, _id: String(x._id) })) });
  } catch (error) { console.error("monitoring_events_list_failed", error); return NextResponse.json({ error: "Could not load monitoring events." }, { status: 500 }); }
}
