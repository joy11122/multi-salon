import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
export async function createStripeRefund(input: { salonId: string; paymentId: ObjectId; amount?: number; reason?: string; actorId: string }) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY is not configured.");
  const db = await getDb(), payment = await db.collection("payments").findOne({ _id: input.paymentId, salonId: input.salonId });
  if (!payment) throw new Error("Payment not found.");
  const intent = String(payment.providerPaymentIntentId || "");
  if (!intent) throw new Error("Payment is missing its Stripe PaymentIntent reference.");
  if (payment.status !== "PAID") throw new Error("Only paid payments can be refunded.");
  const amount = input.amount === undefined ? Number(payment.amount) : input.amount;
  if (!Number.isInteger(amount) || amount <= 0 || amount > Number(payment.amount)) throw new Error("Invalid refund amount.");
  const existing = await db.collection("refunds").findOne({ salonId: input.salonId, paymentId: payment._id, status: { $in: ["PROCESSING", "PENDING", "SUCCEEDED"] } });
  if (existing) throw new Error("A refund is already pending or completed for this payment.");
  const record = await db.collection("refunds").insertOne({ salonId: input.salonId, paymentId: payment._id, appointmentId: payment.appointmentId, amount, currency: "bdt", reason: (input.reason || "requested_by_customer").slice(0, 500), status: "PROCESSING", provider: "STRIPE", createdBy: input.actorId, createdAt: new Date(), updatedAt: new Date() });
  try {
    const form = new URLSearchParams({ payment_intent: intent, amount: String(amount * 100), reason: "requested_by_customer", "metadata[salonId]": input.salonId, "metadata[refundRecordId]": String(record.insertedId) });
    const response = await fetch("https://api.stripe.com/v1/refunds", { method: "POST", headers: { Authorization: "Bearer " + secret, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": "salon-refund-" + record.insertedId }, body: form, signal: AbortSignal.timeout(10000) });
    const payload = await response.json() as { id?: string; status?: string; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || "Stripe refund failed.");
    await db.collection("refunds").updateOne({ _id: record.insertedId, salonId: input.salonId }, { $set: { providerRefundId: payload.id, status: payload.status === "succeeded" ? "SUCCEEDED" : "PENDING", updatedAt: new Date() } });
    return { refundId: String(record.insertedId), providerRefundId: payload.id, status: payload.status || "pending" };
  } catch (error) {
    await db.collection("refunds").updateOne({ _id: record.insertedId, salonId: input.salonId }, { $set: { status: "FAILED", error: error instanceof Error ? error.message : "Refund failed", updatedAt: new Date() } });
    throw error;
  }
}
