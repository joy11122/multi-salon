import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";

function minuteOfDay(value: string) { const parts = value.split(":").map(Number); return parts[0] * 60 + parts[1]; }
const dhakaTime = (date: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);

export async function isStaffScheduled(input: { salonId: string; staffId: ObjectId; date: string; startAt: Date; endAt: Date }) {
  const db = await getDb();
  const weekday = new Date(input.date + "T06:00:00Z").getUTCDay();
  const startText = dhakaTime(input.startAt), endText = dhakaTime(input.endAt);
  const [shifts, leave] = await Promise.all([
    db.collection("staffShifts").find({ salonId: input.salonId, staffId: input.staffId, dayOfWeek: weekday, active: { $ne: false } }).toArray(),
    db.collection("staffLeave").findOne({ salonId: input.salonId, staffId: input.staffId, date: input.date, status: { $ne: "CANCELLED" }, $or: [{ type: "FULL_DAY" }, { startTime: { $lt: endText }, endTime: { $gt: startText } }] }),
  ]);
  if (leave) return false;
  if (!shifts.length) return true;
  const start = minuteOfDay(startText), end = minuteOfDay(endText);
  return shifts.some((shift) => {
    if (start < minuteOfDay(String(shift.startTime)) || end > minuteOfDay(String(shift.endTime))) return false;
    return !(Array.isArray(shift.breaks) && shift.breaks.some((pause: { startTime: string; endTime: string }) => start < minuteOfDay(pause.endTime) && end > minuteOfDay(pause.startTime)));
  });
}
