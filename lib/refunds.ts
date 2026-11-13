import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";

function sslCommerzBase() { return process.env.SSLCOMMERZ_SANDBOX === "true" ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com"; }
function sslCommerzCredentials() {
  const storeId = process.env.SSLCOMMERZ_STORE_ID, storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
  if (!storeId || !storePassword) throw new Error("SSLCommerz merchant credentials are not configured.");
  return { storeId, storePassword };
}
export async function createRefund(input: { salonId: string; paymentId: ObjectId; amount?: number; reason?: string; actorId: string }) {
  const db = await getDb(), payment = await db.collection("payments").findOne({ _id: input.paymentId, salonId: input.salonId });
  if (!payment) throw new Error("Payment not found.");
  if (payment.status !== "PAID") throw new Error("Only paid payments can be refunded.");
  const amount = input.amount === undefined ? Number(payment.amount) : input.amount;
  if (!Number.isFinite(amount) || amount <= 0 || amount > Number(payment.amount)) throw new Error("Refund amount must be positive and cannot exceed the payment.");
  const existing = await db.collection("refunds").findOne({ salonId: input.salonId, paymentId: payment._id, status: { $in: ["PROCESSING", "PENDING", "SUCCEEDED"] } });
  if (existing) throw new Error("A refund is already pending or completed for this payment.");

  const stripeIntent = String(payment.providerPaymentIntentId || "");
  const bankTranId = String(payment.bankTranId || payment.bank_tran_id || "");
  const provider = stripeIntent ? "STRIPE" : bankTranId ? "SSLCOMMERZ" : "";
  if (!provider) throw new Error("This payment has no supported gateway transaction reference. Cash and manual wallet payments must be refunded through their original provider.");
  const record = await db.collection("refunds").insertOne({ salonId: input.salonId, paymentId: payment._id, appointmentId: payment.appointmentId, amount, currency: "BDT", reason: (input.reason || "Customer refund request").slice(0, 500), status: "PROCESSING", provider, createdBy: input.actorId, createdAt: new Date(), updatedAt: new Date() });
  try {
    if (provider === "STRIPE") {
      const secret = process.env.STRIPE_SECRET_KEY;
      if (!secret) throw new Error("STRIPE_SECRET_KEY is not configured.");
      const form = new URLSearchParams({ payment_intent: stripeIntent, amount: String(Math.round(amount * 100)), reason: "requested_by_customer", "metadata[salonId]": input.salonId, "metadata[refundRecordId]": String(record.insertedId) });
      const response = await fetch("https://api.stripe.com/v1/refunds", { method: "POST", headers: { Authorization: "Bearer " + secret, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": "salon-refund-" + record.insertedId }, body: form, signal: AbortSignal.timeout(10000) });
      const payload = await response.json() as { id?: string; status?: string; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Stripe refund failed.");
      await db.collection("refunds").updateOne({ _id: record.insertedId, salonId: input.salonId }, { $set: { providerRefundId: payload.id, status: payload.status === "succeeded" ? "SUCCEEDED" : "PENDING", updatedAt: new Date() } });
      return { refundId: String(record.insertedId), providerRefundId: payload.id, status: payload.status || "pending", provider };
    }

    const credentials = sslCommerzCredentials();
    const refundTransactionId = "RF" + randomUUID().replace(/-/g, "").slice(0, 26);
    const params = new URLSearchParams({ bank_tran_id: bankTranId, refund_trans_id: refundTransactionId, refund_amount: amount.toFixed(2), refund_remarks: (input.reason || "Customer refund request").slice(0, 255), refe_id: String(record.insertedId), store_id: credentials.storeId, store_passwd: credentials.storePassword, v: "1", format: "json" });
    const response = await fetch(sslCommerzBase() + "/validator/api/merchantTransIDvalidationAPI.php?" + params.toString(), { method: "GET", cache: "no-store", signal: AbortSignal.timeout(12000) });
    const payload = await response.json() as { APIConnect?: string; status?: string; refund_ref_id?: string; errorReason?: string };
    if (!response.ok || payload.APIConnect !== "DONE" || !["success", "processing"].includes(String(payload.status))) throw new Error(payload.errorReason || "SSLCommerz could not initiate the refund.");
    await db.collection("refunds").updateOne({ _id: record.insertedId, salonId: input.salonId }, { $set: { providerRefundId: payload.refund_ref_id, refundTransactionId, status: "PENDING", providerStatus: payload.status, updatedAt: new Date() } });
    return { refundId: String(record.insertedId), providerRefundId: payload.refund_ref_id, status: payload.status, provider };
  } catch (error) {
    await db.collection("refunds").updateOne({ _id: record.insertedId, salonId: input.salonId }, { $set: { status: "FAILED", error: error instanceof Error ? error.message : "Refund failed", updatedAt: new Date() } });
    throw error;
  }
}

export async function refreshRefundStatuses(salonId?: string) {
  const db = await getDb();
  const filter: Record<string, unknown> = { provider: "SSLCOMMERZ", status: "PENDING", providerRefundId: { $type: "string" } };
  if (salonId) filter.salonId = salonId;
  const pending = await db.collection("refunds").find(filter).limit(50).toArray();
  const credentials = sslCommerzCredentials();
  let updated = 0;
  for (const item of pending) {
    try {
      const params = new URLSearchParams({ refund_ref_id: String(item.providerRefundId), store_id: credentials.storeId, store_passwd: credentials.storePassword, format: "json" });
      const response = await fetch(sslCommerzBase() + "/validator/api/merchantTransIDvalidationAPI.php?" + params.toString(), { method: "GET", cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!response.ok) continue;
      const result = await response.json() as { status?: string; errorReason?: string };
      const status = result.status === "refunded" ? "SUCCEEDED" : result.status === "cancelled" ? "FAILED" : "PENDING";
      if (status !== "PENDING") {
        await db.collection("refunds").updateOne({ _id: item._id, salonId: item.salonId, status: "PENDING" }, { $set: { status, providerStatus: result.status, updatedAt: new Date(), statusCheckedAt: new Date() } });
        if (status === "SUCCEEDED") await db.collection("payments").updateOne({ _id: item.paymentId, salonId: item.salonId }, { $set: { refundStatus: "REFUNDED", updatedAt: new Date() } });
        updated += 1;
      }
    } catch (error) { console.error("sslcommerz_refund_status_check_failed", { refundId: String(item._id), error }); }
  }
  return { checked: pending.length, updated };
}
