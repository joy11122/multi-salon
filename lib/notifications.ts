import { getDb } from "@/lib/db/client";
import { captureOperationalError } from "@/lib/monitoring";
type Notice = { salonId: string; bookingRef: string; customerName: string; phone: string; email: string; serviceName: string; staffName: string; startAt: Date; price: number; salonName: string };
async function email(to: string, subject: string, text: string) {
  if (!to || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return { skipped: true };
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [to], subject, text }), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("Resend email failed: " + r.status);
  return await r.json() as { id?: string };
}
async function twilio(to: string, body: string, channel: "sms" | "whatsapp") {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN;
  const from = channel === "sms" ? process.env.TWILIO_SMS_FROM : process.env.TWILIO_WHATSAPP_FROM;
  if (!to || !sid || !token || !from) return { skipped: true };
  const digits = to.replace(/[^0-9+]/g, "");
  const e164 = digits.startsWith("+") ? digits : digits.startsWith("880") ? "+" + digits : digits.startsWith("0") ? "+88" + digits : "+" + digits;
  const recipient = channel === "whatsapp" ? (e164.startsWith("whatsapp:") ? e164 : "whatsapp:" + e164) : e164;
  const sender = channel === "whatsapp" && !from.startsWith("whatsapp:") ? "whatsapp:" + from : from;
  const contentSid = channel === "whatsapp" ? process.env.TWILIO_WHATSAPP_CONTENT_SID : undefined;
  const form = new URLSearchParams({ To: recipient, From: sender });
  if (contentSid) { form.set("ContentSid", contentSid); form.set("ContentVariables", JSON.stringify({ "1": body })); }
  else form.set("Body", body);
  const r = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json", { method: "POST", headers: { Authorization: "Basic " + Buffer.from(sid + ":" + token).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" }, body: form, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("Twilio " + channel + " failed: " + r.status);
  return await r.json() as { sid?: string };
}
async function audit(n: { salonId: string; bookingRef: string; channel: string; recipient: string; status: string; providerId?: string; error?: string }) {
  try { await (await getDb()).collection("notificationDeliveries").insertOne({ ...n, createdAt: new Date() }); } catch (e) { console.error("notification_audit_failed", e); }
}
async function deliver(n: { salonId: string; bookingRef: string; channel: string; recipient: string; run: () => Promise<{ skipped?: boolean; id?: string; sid?: string }> }) {
  try { const r = await n.run(); await audit({ salonId: n.salonId, bookingRef: n.bookingRef, channel: n.channel, recipient: n.recipient, status: r.skipped ? "SKIPPED_NOT_CONFIGURED" : "SENT", providerId: r.id || r.sid }); }
  catch (e) { console.error("notification_failed", { channel: n.channel, bookingRef: n.bookingRef, error: e }); await audit({ salonId: n.salonId, bookingRef: n.bookingRef, channel: n.channel, recipient: n.recipient, status: "FAILED", error: e instanceof Error ? e.message : "Provider error" }); await captureOperationalError({ error: e, route: "booking-notification/" + n.channel, method: "DELIVERY", salonId: n.salonId, severity: "warning", metadata: { bookingRef: n.bookingRef, channel: n.channel } }); }
}
export async function sendBookingNotifications(b: Notice) {
  const when = new Intl.DateTimeFormat("en-BD", { timeZone: "Asia/Dhaka", dateStyle: "full", timeStyle: "short" }).format(b.startAt);
  const message = "Booking " + b.bookingRef + ": " + b.serviceName + " at " + b.salonName + ", " + when + ". Staff: " + b.staffName + ". Amount: BDT " + b.price + ". Pending salon confirmation.";
  await Promise.all([
    deliver({ salonId: b.salonId, bookingRef: b.bookingRef, channel: "email", recipient: b.email, run: () => email(b.email, "Booking received · " + b.bookingRef, "Hello " + b.customerName + ",\n\n" + message) }),
    deliver({ salonId: b.salonId, bookingRef: b.bookingRef, channel: "sms", recipient: b.phone, run: () => twilio(b.phone, message, "sms") }),
    deliver({ salonId: b.salonId, bookingRef: b.bookingRef, channel: "whatsapp", recipient: b.phone, run: () => twilio(b.phone, message, "whatsapp") }),
  ]);
}
export async function sendBookingCancellationNotice(b: { salonId: string; bookingRef: string; customerName: string; phone: string; email: string; serviceName: string }) {
  const message = "Your booking " + b.bookingRef + " for " + b.serviceName + " has been cancelled.";
  await Promise.all([
    deliver({ salonId: b.salonId, bookingRef: b.bookingRef, channel: "email", recipient: b.email, run: () => email(b.email, "Booking cancelled · " + b.bookingRef, "Hello " + b.customerName + ",\n\n" + message) }),
    deliver({ salonId: b.salonId, bookingRef: b.bookingRef, channel: "sms", recipient: b.phone, run: () => twilio(b.phone, message, "sms") }),
    deliver({ salonId: b.salonId, bookingRef: b.bookingRef, channel: "whatsapp", recipient: b.phone, run: () => twilio(b.phone, message, "whatsapp") }),
  ]);
}
