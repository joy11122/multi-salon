import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const raw = await request.text(), header = request.headers.get("stripe-signature") || "";
  const parts = header.split(",").map(x => x.split("="));
  const timestamp = parts.find(x => x[0] === "t")?.[1], signatures = parts.filter(x => x[0] === "v1").map(x => x[1]);
  if (!timestamp || !Number.isFinite(Number(timestamp)) || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  const expected = createHmac("sha256", secret).update(timestamp + "." + raw).digest("hex");
  const valid = signatures.some(sig => { try { const a = Buffer.from(sig, "hex"), b = Buffer.from(expected, "hex"); return a.length === b.length && timingSafeEqual(a, b); } catch { return false; } });
  if (!valid) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  try {
    const event = JSON.parse(raw) as { id: string; type: string; data?: { object?: { id?: string; status?: string; metadata?: Record<string,string> } } };
    if (event.type === "refund.updated") {
      const refund = event.data?.object;
      const refundId = refund?.metadata?.refundRecordId;
      if (refund?.id) {
        const db = await getDb();
        const status = refund.status === "succeeded" ? "SUCCEEDED" : refund.status === "failed" || refund.status === "canceled" ? "FAILED" : "PENDING";
        const filter = refundId && /^[a-f\d]{24}$/i.test(refundId) ? { _id: new ObjectId(refundId) } : { providerRefundId: refund.id };
        const updated = await db.collection("refunds").findOneAndUpdate(filter, { $set: { status, activeLock: status !== "FAILED", providerRefundId: refund.id, updatedAt: new Date(), lastWebhookEventId: event.id } }, { returnDocument: "after" });
        if (status === "SUCCEEDED" && updated) await db.collection("payments").updateOne({ _id: updated.paymentId, salonId: updated.salonId }, { $set: { refundStatus: "REFUNDED", updatedAt: new Date() } });
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe_webhook_failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
