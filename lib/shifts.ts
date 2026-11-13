import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/client";
import { getDhakaDate, getDhakaTime } from "@/lib/utils";

function minuteOfDay(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
function weekdayOf(date: string) {
  return new Date(date + "T06:00:00Z").getUTCDay();
}
function addCalendarDays(date: string, days: number) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function dayOffset(from: string, to: string) {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86_400_000);
}
function shiftInterval(shift: { startTime: string; endTime: string }, offset: number) {
  const startClock = minuteOfDay(shift.startTime);
  const endClock = minuteOfDay(shift.endTime);
  const start = startClock + offset;
  const end = endClock + offset + (endClock <= startClock ? 1440 : 0);
  return { start, end };
}
function breakIntervals(
  shift: { startTime: string; breaks?: Array<{ startTime: string; endTime: string }> },
  offset: number,
) {
  const shiftStartClock = minuteOfDay(shift.startTime);
  return (Array.isArray(shift.breaks) ? shift.breaks : []).map((pause) => {
    let start = minuteOfDay(pause.startTime);
    let end = minuteOfDay(pause.endTime);
    if (start < shiftStartClock) start += 1440;
    if (end < shiftStartClock) end += 1440;
    if (end <= start) end += 1440;
    return { start: start + offset, end: end + offset };
  });
}

export function bookingConflictsWithShift(
  booking: { startAt: Date; endAt: Date },
  shift: { dayOfWeek: number; startTime: string; endTime: string; active?: boolean; breaks?: Array<{ startTime: string; endTime: string }> },
) {
  const date = getDhakaDate(booking.startAt);
  const weekday = weekdayOf(date);
  const endDate = getDhakaDate(booking.endAt);
  const start = minuteOfDay(getDhakaTime(booking.startAt));
  const end = minuteOfDay(getDhakaTime(booking.endAt)) + dayOffset(date, endDate) * 1440;
  const previousWeekday = (weekday + 6) % 7;
  const isPreviousOvernight = shift.dayOfWeek === previousWeekday && minuteOfDay(shift.endTime) <= minuteOfDay(shift.startTime);
  const isSameDay = shift.dayOfWeek === weekday;
  if (!isSameDay && !isPreviousOvernight) return false;
  if (shift.active === false) return true;
  const offset = isPreviousOvernight ? -1440 : 0;
  const interval = shiftInterval(shift, offset);
  if (start < interval.start || end > interval.end) return true;
  return breakIntervals(shift, offset).some((pause) => start < pause.end && end > pause.start);
}

const dhakaTime = (date: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);

export async function getStaffScheduleChecker(input: { salonId: string; staffId: ObjectId; date: string }) {
  const db = await getDb();
  const weekday = weekdayOf(input.date);
  const previousWeekday = (weekday + 6) % 7;
  const nextDate = addCalendarDays(input.date, 1);
  const [shifts, leave, configuredCount] = await Promise.all([
    db.collection("staffShifts").find({
      salonId: input.salonId,
      staffId: input.staffId,
      dayOfWeek: { $in: [weekday, previousWeekday] },
      active: { $ne: false },
    }).toArray(),
    db.collection("staffLeave").find({
      salonId: input.salonId,
      staffId: input.staffId,
      date: { $in: [input.date, nextDate] },
      status: { $ne: "CANCELLED" },
    }).toArray(),
    db.collection("staffShifts").countDocuments({ salonId: input.salonId, staffId: input.staffId }),
  ]);
  return (startAt: Date, endAt: Date) => {
    const startDate = getDhakaDate(startAt);
    const endDate = getDhakaDate(endAt);
    const start = minuteOfDay(dhakaTime(startAt)) + dayOffset(input.date, startDate) * 1440;
    const end = minuteOfDay(dhakaTime(endAt)) + dayOffset(input.date, endDate) * 1440;
    const leaveBlocks = leave.some((item) => {
      const offset = dayOffset(input.date, String(item.date)) * 1440;
      if (item.type === "FULL_DAY") return start < offset + 1440 && end > offset;
      if (typeof item.startTime !== "string" || typeof item.endTime !== "string") return false;
      const leaveStart = minuteOfDay(item.startTime) + offset;
      const leaveEnd = minuteOfDay(item.endTime) + offset + (minuteOfDay(item.endTime) <= minuteOfDay(item.startTime) ? 1440 : 0);
      return start < leaveEnd && end > leaveStart;
    });
    if (leaveBlocks) return false;
    if (!configuredCount) return true;
    return shifts.some((shift) => {
      const sameDay = shift.dayOfWeek === weekday;
      const previousOvernight = shift.dayOfWeek === previousWeekday
        && minuteOfDay(String(shift.endTime)) <= minuteOfDay(String(shift.startTime));
      if (!sameDay && !previousOvernight) return false;
      const offset = previousOvernight ? -1440 : 0;
      const interval = shiftInterval({ startTime: String(shift.startTime), endTime: String(shift.endTime) }, offset);
      if (start < interval.start || end > interval.end) return false;
      return !breakIntervals({
        startTime: String(shift.startTime),
        breaks: Array.isArray(shift.breaks) ? shift.breaks as Array<{ startTime: string; endTime: string }> : [],
      }, offset).some((pause) => start < pause.end && end > pause.start);
    });
  };
}
export async function isStaffScheduled(input: { salonId: string; staffId: ObjectId; date: string; startAt: Date; endAt: Date }) {
  const check = await getStaffScheduleChecker({ salonId: input.salonId, staffId: input.staffId, date: input.date });
  return check(input.startAt, input.endAt);
}
