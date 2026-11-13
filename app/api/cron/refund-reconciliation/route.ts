import { NextResponse } from "next/server";
import { refreshRefundStatuses } from "@/lib/refunds";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!process.env.SSLCOMMERZ_STORE_ID || !process.env.SSLCOMMERZ_STORE_PASSWORD) return NextResponse.json({ checked: 0, updated: 0, skipped: "SSLCommerz is not configured." });
  try { return NextResponse.json(await refreshRefundStatuses()); }
  catch (error) { console.error("refund_reconciliation_cron_failed", error); return NextResponse.json({ error: "Refund reconciliation failed." }, { status: 500 }); }
}
