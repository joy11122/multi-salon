import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createCloudinaryUploadSignature } from "@/lib/cloudinary";
import { findActiveSalonBySlug, requireSalonMembership } from "@/lib/tenancy";
const schema = z.object({ salonSlug: z.string().min(3).max(80), resourceType: z.enum(["image"]).default("image") }).strict();
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await rateLimit("upload-signature:" + ip, 20, 60_000)).allowed) return NextResponse.json({ error: "Too many upload requests." }, { status: 429 });
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
    const salon = await findActiveSalonBySlug(parsed.data.salonSlug);
    if (!salon) return NextResponse.json({ error: "Salon not found." }, { status: 404 });
    const access = await requireSalonMembership(await auth(), String(salon.salonId), ["OWNER", "ADMIN", "MANAGER"]);
    if ("response" in access) return access.response;
    const folder = "multi-salon/" + String(salon.salonId).replace(/[^a-zA-Z0-9_-]/g, "") + "/images";
    const signed = createCloudinaryUploadSignature(Math.floor(Date.now() / 1000), folder);
    return NextResponse.json(signed, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("upload_signature_failed", error);
    return NextResponse.json({ error: "Image uploads are unavailable. Check Cloudinary configuration." }, { status: 503 });
  }
}
