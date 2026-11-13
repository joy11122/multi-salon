import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/monitoring";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const token = process.env.HEALTHCHECK_TOKEN;
  const detailed = new URL(request.url).searchParams.get("details") === "1";
  if (detailed && (!token || request.headers.get("authorization") !== "Bearer " + token)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const status = await getHealthStatus();
  if (!detailed) return NextResponse.json({ status: status.status, timestamp: status.timestamp }, { status: status.status === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(status, { status: status.status === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
