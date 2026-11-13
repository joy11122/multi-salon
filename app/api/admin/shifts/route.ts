import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { findActiveSalonBySlug, requireSalonMembership } from "@/lib/tenancy";
import { captureOperationalError } from "@/lib/monitoring";

const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const shiftSchema = z.object({ kind: z.literal("shift"), staffId: z.string().regex(/^[a-f\d]{24}$/i), dayOfWeek: z.number().int().min(0).max(6), startTime: time, endTime: time, breaks: z.array(z.object({ startTime: time, endTime: time })).max(5).default([]), active: z.boolean().default(true) }).strict();
const leaveSchema = z.object({ kind: z.literal("leave"), staffId: z.string().regex(/^[a-f\d]{24}$/i), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), type: z.enum(["FULL_DAY", "PARTIAL"]), startTime: time.optional(), endTime: time.optional(), reason: z.string().trim().max(300).optional() }).strict();
async function scope(request: Request) {
  const slug = new URL(request.url).searchParams.get("salonSlug");
  if (!slug) return { response: NextResponse.json({ error: "Salon context is required." }, { status: 400 }) };
  const salon = await findActiveSalonBySlug(slug);
  if (!salon) return { response: NextResponse.json({ error: "Salon not found." }, { status: 404 }) };
  const session = await auth();
  const access = await requireSalonMembership(session, String(salon.salonId), ["OWNER", "ADMIN", "MANAGER"]);
  if ("response" in access) return { response: access.response };
  return { salonId: String(salon.salonId) };
}
export async function GET(request: Request) {
  const s = await scope(request); if ("response" in s) return s.response;
  try {
    const db = await getDb();
    const [shifts, leave, staff] = await Promise.all([
      db.collection("staffShifts").find({ salonId: s.salonId }).sort({ dayOfWeek: 1, startTime: 1 }).toArray(),
      db.collection("staffLeave").find({ salonId: s.salonId }).sort({ date: -1 }).limit(200).toArray(),
      db.collection("staff").find({ salonId: s.salonId, active: true }).project({ name: 1, title: 1 }).sort({ name: 1 }).toArray(),
    ]);
    return NextResponse.json({ shifts: shifts.map(x => ({ ...x, _id: String(x._id), staffId: String(x.staffId) })), leave: leave.map(x => ({ ...x, _id: String(x._id), staffId: String(x.staffId) })), staff: staff.map(x => ({ ...x, _id: String(x._id) })) });
  } catch (error) { console.error("staff_shifts_get_failed", error); return NextResponse.json({ error: "Could not load staff schedules." }, { status: 500 }); }
}
export async function POST(request: Request) {
  const s = await scope(request); if ("response" in s) return s.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const isShift = body.kind === "shift";
    const parsed = isShift ? shiftSchema.safeParse(body) : leaveSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid schedule." }, { status: 400 });
    const data = parsed.data as z.infer<typeof shiftSchema> | z.infer<typeof leaveSchema>;
    if (data.kind === "shift" && data.startTime >= data.endTime) return NextResponse.json({ error: "Shift end must be after shift start." }, { status: 400 });
    if (data.kind === "shift" && data.breaks.some(b => b.startTime >= b.endTime || b.startTime < data.startTime || b.endTime > data.endTime)) return NextResponse.json({ error: "Breaks must be within the shift." }, { status: 400 });
    if (data.kind === "leave" && data.type === "PARTIAL" && (!data.startTime || !data.endTime || data.startTime >= data.endTime)) return NextResponse.json({ error: "Partial leave requires a valid start and end time." }, { status: 400 });
    const db = await getDb(), staffId = new ObjectId(data.staffId);
    const staff = await db.collection("staff").findOne({ _id: staffId, salonId: s.salonId, active: true });
    if (!staff) return NextResponse.json({ error: "Active staff member not found in this salon." }, { status: 404 });
    const now = new Date();
    if (data.kind === "shift") {
      await db.collection("staffShifts").updateOne({ salonId: s.salonId, staffId, dayOfWeek: data.dayOfWeek }, { $set: { ...data, salonId: s.salonId, staffId, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true });
    } else {
      const { kind, ...leave } = data;
      await db.collection("staffLeave").insertOne({ ...leave, salonId: s.salonId, staffId, status: "ACTIVE", createdAt: now, updatedAt: now });
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) { await captureOperationalError({ error, route: "/api/admin/shifts", method: "POST", salonId: s.salonId }); return NextResponse.json({ error: "Could not save staff schedule." }, { status: 500 }); }
}
export async function DELETE(request: Request) {
  const s = await scope(request); if ("response" in s) return s.response;
  const params = new URL(request.url).searchParams, id = params.get("id") || "", kind = params.get("kind");
  if (!ObjectId.isValid(id) || !["shift", "leave"].includes(String(kind))) return NextResponse.json({ error: "Invalid schedule record." }, { status: 400 });
  try {
    const result = await (await getDb()).collection(kind === "shift" ? "staffShifts" : "staffLeave").deleteOne({ _id: new ObjectId(id), salonId: s.salonId });
    return result.deletedCount ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  } catch (error) { await captureOperationalError({ error, route: "/api/admin/shifts", method: "DELETE", salonId: s.salonId }); return NextResponse.json({ error: "Could not delete schedule." }, { status: 500 }); }
}
