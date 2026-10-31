import { randomBytes } from 'crypto';

export const SALON_ID = process.env.SALON_ID || 'the-gentlemens-club-khulna';
export const TIME_ZONE = 'Asia/Dhaka';
export const money = (amount: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(amount);
export function bookingReference() { return `TGC-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`; }
export function toDhakaDateTime(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 6, minute));
}
export function addMinutes(date: Date, minutes: number) { return new Date(date.getTime() + minutes * 60_000); }
export function getDhakaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function getDhakaTime(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}
