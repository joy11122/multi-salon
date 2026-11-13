import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { getDhakaDate, getDhakaTime } from "@/lib/utils";

function minuteOfDay(value: string) { const parts = value.split(":").map(Number); return parts[0] * 60 + parts[1]; }

export function bookingConflictsWithShift(
  booking: { startAt: Date; endAt: Date },
  shift: { dayOfWeek: number; startTime: string; endTime: string; active?: boolean; breaks?: Array<{ startTime: string; endTime: string }> },
) {
  const date = getDhakaDate(booking.startAt);
  const weekday = new Date(date + "T06:00:00Z").getUTCDay();
  if (weekday !== shift.dayOfWeek) return false;
  if (shift.active === false) return true;
  const start = minuteOfDay(getDhakaTime(booking.startAt));
  const endDate = getDhakaDate(booking.endAt);
  const end = minuteOfDay(getDhakaTime(booking.endAt)) + (endDate !== date ? 1440 : 0);
  if (start < minuteOfDay(shift.startTime) || end > minuteOfDay(shift.endTime)) return true;
  return Array.isArray(shift.breaks) && shift.breaks.some((pause) => (
    start < minuteOfDay(pause.endTime) && end > minuteOfDay(pause.startTime)
  ));
}

const dhakaTime = (date: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);

export async function getStaffScheduleChecker(input: { salonId: string; staffId: ObjectId; date: string }) {
  const db = await getDb();
  const weekday = new Date(input.date + "T06:00:00Z").getUTCDay();
  const [shifts, leave, configuredCount] = await Promise.all([
    db.collection("staffShifts").find({ salonId: input.salonId, staffId: input.staffId, dayOfWeek: weekday, active: { $ne: false } }).toArray(),
    db.collection("staffLeave").find({ salonId: input.salonId, staffId: input.staffId, date: input.date, status: { $ne: "CANCELLED" } }).toArray(),
    db.collection("staffShifts").countDocuments({ salonId: input.salonId, staffId: input.staffId }),
  ]);
  return (startAt: Date, endAt: Date) => {
    const startText = dhakaTime(startAt), endText = dhakaTime(endAt);
    const start = minuteOfDay(startText), end = minuteOfDay(endText);
    if (leave.some((item) => item.type === "FULL_DAY" || (typeof item.startTime === "string" && typeof item.endTime === "string" && start < minuteOfDay(item.endTime) && end > minuteOfDay(item.startTime)))) return false;
    if (!configuredCount) return true;
    return shifts.some((shift) => {
      if (start < minuteOfDay(String(shift.startTime)) || end > minuteOfDay(String(shift.endTime))) return false;
      return !(Array.isArray(shift.breaks) && shift.breaks.some((pause: { startTime: string; endTime: string }) => start < minuteOfDay(pause.endTime) && end > minuteOfDay(pause.startTime)));
    });
  };
}
export async function isStaffScheduled(input: { salonId: string; staffId: ObjectId; date: string; startAt: Date; endAt: Date }) {
  const check = await getStaffScheduleChecker({ salonId: input.salonId, staffId: input.staffId, date: input.date });
  return check(input.startAt, input.endAt);
}
