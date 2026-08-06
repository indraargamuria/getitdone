/**
 * Date utilities.
 *
 * All date-only math ("YYYY-MM-DD") is done in *local* time. We never parse
 * these strings as UTC, so "2026-08-06" always means midnight on August 6 in
 * the user's timezone. This keeps due dates honest across the edge.
 */

const PAD = (n: number) => String(n).padStart(2, "0");

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`;
}

/** Parse "YYYY-MM-DD" as a local-time Date at midnight. */
export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function toISO(d: Date): string {
  return d.toISOString();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function addDaysStr(dateStr: string, n: number): string {
  return toDateStr(addDays(parseDateStr(dateStr), n));
}

export function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 86_400_000;
  const aNorm = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bNorm = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bNorm - aNorm) / MS_PER_DAY);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateStr(a) === toDateStr(b);
}

/** Whole days from today to the given date (0 = today, negative = past). */
export function daysFromToday(dateStr: string): number {
  return daysBetween(new Date(), parseDateStr(dateStr));
}

export function startOfToday(): string {
  return toDateStr(new Date());
}

export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDateStr(s);
  return toDateStr(d) === s;
}

export function isValidTimeStr(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export interface ISOWeekday {
  iso: number; // 1..7, Monday=1
  enShort: string;
  enLong: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Human label for a due date relative to today: "Today", "Tomorrow", "Mon, Aug 9". */
export function humanDueLabel(dateStr: string, now = new Date()): string {
  const diff = daysBetween(now, parseDateStr(dateStr));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const d = parseDateStr(dateStr);
  const weekday =
    diff >= 2 && diff <= 6
      ? `${DAY_NAMES[d.getDay()]}`
      : `${DAY_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
  return weekday;
}

export function formatMonthYear(d = new Date()): string {
  return `${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "HH:mm" -> local 12h display. */
export function humanTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const hour = h ?? 0;
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

export function toDateTimeStr(dateStr: string, timeStr: string | null): string {
  return timeStr ? `${dateStr}T${timeStr}` : dateStr;
}
