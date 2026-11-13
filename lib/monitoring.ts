import { getDb } from "@/lib/db/client";

export async function captureOperationalError(input: { error: unknown; route: string; method?: string; salonId?: string; severity?: "warning" | "error" | "critical"; metadata?: Record<string, unknown> }) {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const event = { route: input.route, method: input.method || "UNKNOWN", salonId: input.salonId, severity: input.severity || "error", message: message.slice(0, 2000), stack: input.error instanceof Error ? input.error.stack?.slice(0, 8000) : undefined, metadata: input.metadata, createdAt: new Date() };
  console.error("operational_error", event);
  try { await (await getDb()).collection("monitoringEvents").insertOne(event); }
  catch (storageError) { console.error("monitoring_event_persist_failed", storageError); }
  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (webhook) {
    try { await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "[" + event.severity.toUpperCase() + "] " + event.route + ": " + event.message, ...event }), signal: AbortSignal.timeout(4000) }); }
    catch (alertError) { console.error("monitoring_alert_delivery_failed", alertError); }
  }
}

export async function getHealthStatus() {
  const checks: Record<string, "ok" | "error" | "not_configured"> = {
    database: "error",
    sharedRateLimit: process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? "ok" : "not_configured",
    email: process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL ? "ok" : "not_configured",
    sms: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM ? "ok" : "not_configured",
    whatsapp: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM ? "ok" : "not_configured",
    imageStorage: process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET ? "ok" : "not_configured",
    refunds: process.env.STRIPE_SECRET_KEY || (process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD) ? "ok" : "not_configured",
  };
  try { await (await getDb()).command({ ping: 1 }); checks.database = "ok"; } catch { checks.database = "error"; }
  return { status: checks.database === "ok" && checks.sharedRateLimit !== "not_configured" ? "ok" : "degraded", checks, timestamp: new Date().toISOString() };
}
