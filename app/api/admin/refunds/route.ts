import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { createStripeRefund } from "@/lib/refunds";
import { findActiveSalonBySlug, requireSalonMembership } from "@/lib/tenancy";
import { captureOperationalError } from "@/lib/monitoring";
const schema = z.object({ salonSlug: z.string().min(3).max(80), paymentId: z.string().regex(/^[a-f\d]{24}$/i), amount: z.number().int().positive().optional(), reason: z.string().trim().max(500).optional() }).strict();
async function authorize(request: Request) {
  const slug = new URL(request.url).searchParams.get("salonSlug");
  if (!slug) return { response: NextResponse.json({ error: "Salon context is required." }, { status: 400 }) };
  const salon = await findActiveSalonBySlug(slug);
  if (!salon) return { response: NextResponse.json({ error: "Salon not found." }, { status: 404 }) };
  const session = await auth(), access = await requireSalonMembership(session, String(salon.salonId), ["OWNER", "ADMIN"]);
  if ("response" in access) return { response: access.response };
  return { salonId: String(salon.salonId), actorId: String(session?.user?.id || session?.user?.email || "") };
}
export async function GET(request: Request) {
  const s = await authorize(request); if ("response" in s) return s.response;
  try {
    const items = await (await getDb()).collection("refunds").find({ salonId: s.salonId }).sort({ createdAt: -1 }).limit(100).toArray();
    return NextResponse.json({ items: items.map(x => ({ ...x, _id: String(x._id), paymentId: String(x.paymentId) })) });
  } catch (error) { console.error("refunds_list_failed", error); return NextResponse.json({ error: "Could not load refunds." }, { status: 500 }); }
}
export async function POST(request: Request) {
  const s = await authorize(request); if ("response" in s) return s.response;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid refund request." }, { status: 400 });
    if (!ObjectId.isValid(parsed.data.paymentId)) return NextResponse.json({ error: "Invalid payment ID." }, { status: 400 });
    const result = await createStripeRefund({ salonId: s.salonId, paymentId: new ObjectId(parsed.data.paymentId), amount: parsed.data.amount, reason: parsed.data.reason, actorId: s.actorId });
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    await captureOperationalError({ error, route: "/api/admin/refunds", method: "POST" });
    const message = error instanceof Error ? error.message : "Refund failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
