import { addDays, daysBetween, parseDateStr, toDateStr } from "./dates";

/**
 * Minimal recurring-task engine.
 *
 * Supports a practical subset of RRULE:
 *   FREQ=DAILY | WEEKLY | MONTHLY
 *   INTERVAL=n
 *   BYDAY=MO,WE,FR   (weekly)
 *   BYMONTHDAY=15    (monthly)
 *   UNTIL=YYYYMMDD
 *
 * All dates are local "YYYY-MM-DD" strings. Semantics: completing an instance
 * that fell on `anchor` produces the next instance on the next matching date
 * strictly after `anchor`.
 */

export type Freq = "DAILY" | "WEEKLY" | "MONTHLY";

export interface RecurrenceRule {
  freq: Freq;
  interval: number;
  byDay: number[]; // 0=Sunday..6=Saturday (from SU..SA)
  byMonthDay: number[];
  until: string | null;
}

const WEEKDAY_INDEX: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export function parseRecurrenceRule(rule: string): RecurrenceRule {
  const parts: Record<string, string> = {};
  for (const part of rule.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) parts[part.slice(0, idx).toUpperCase()] = part.slice(idx + 1);
  }
  const freqRaw = parts.FREQ ?? "DAILY";
  const freq: Freq = freqRaw === "WEEKLY" ? "WEEKLY" : freqRaw === "MONTHLY" ? "MONTHLY" : "DAILY";
  const interval = Math.max(1, Number.parseInt(parts.INTERVAL ?? "1", 10) || 1);
  const byDay = (parts.BYDAY ?? "")
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter((d) => d in WEEKDAY_INDEX)
    .map((d) => WEEKDAY_INDEX[d]!)
    .sort((a, b) => a - b);
  const byMonthDay = (parts.BYMONTHDAY ?? "")
    .split(",")
    .map((n) => Number.parseInt(n.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31);
  const untilRaw = parts.UNTIL;
  const until =
    untilRaw && /^\d{8}$/.test(untilRaw)
      ? `${untilRaw.slice(0, 4)}-${untilRaw.slice(4, 6)}-${untilRaw.slice(6, 8)}`
      : null;

  return { freq, interval, byDay, byMonthDay, until };
}

export function serializeRecurrenceRule(rule: RecurrenceRule): string {
  const parts = [`FREQ=${rule.freq}`, `INTERVAL=${rule.interval}`];
  if (rule.byDay.length > 0) {
    const names = rule.byDay.map((d) =>
      Object.keys(WEEKDAY_INDEX).find((k) => WEEKDAY_INDEX[k] === d),
    );
    parts.push(`BYDAY=${names.join(",")}`);
  }
  if (rule.byMonthDay.length > 0) parts.push(`BYMONTHDAY=${rule.byMonthDay.join(",")}`);
  if (rule.until) parts.push(`UNTIL=${rule.until.replaceAll("-", "")}`);
  return parts.join(";");
}

function monthIdx(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

/** Clamp a day-of-month to the last valid day of the given month. */
function clampedDay(y: number, m: number, day: number): number {
  const last = new Date(y, m + 1, 0).getDate();
  return Math.min(day, last);
}

function matches(candidate: Date, anchor: Date, rule: RecurrenceRule): boolean {
  if (rule.until && toDateStr(candidate) > rule.until) return false;

  const dayDiff = daysBetween(anchor, candidate);
  if (dayDiff <= 0) return false;

  if (rule.freq === "DAILY") {
    return dayDiff % rule.interval === 0;
  }

  if (rule.freq === "WEEKLY") {
    const weekIdx = Math.floor(dayDiff / 7);
    if (weekIdx % rule.interval !== 0) return false;
    if (rule.byDay.length > 0) return rule.byDay.includes(candidate.getDay());
    return candidate.getDay() === anchor.getDay();
  }

  // MONTHLY
  const monthDiff = monthIdx(candidate) - monthIdx(anchor);
  if (monthDiff % rule.interval !== 0) return false;
  if (rule.byMonthDay.length > 0) {
    const candDay = candidate.getDate();
    return rule.byMonthDay.some(
      (d) => clampedDay(candidate.getFullYear(), candidate.getMonth(), d) === candDay,
    );
  }
  return candidate.getDate() === anchor.getDate();
}

/**
 * Next occurrence strictly after `anchorStr`. Returns "YYYY-MM-DD" or null.
 * Scans at most MAX_DAYS ahead; long custom intervals are clamped by UNTIL.
 */
export function nextOccurrenceAfter(
  ruleOrStr: RecurrenceRule | string,
  anchorStr: string,
): string | null {
  const rule = typeof ruleOrStr === "string" ? parseRecurrenceRule(ruleOrStr) : ruleOrStr;
  const anchor = parseDateStr(anchorStr);
  const MAX_DAYS = 366 * 8;
  const end = addDays(anchor, MAX_DAYS);

  for (let d = addDays(anchor, 1); d <= end; d = addDays(d, 1)) {
    if (matches(d, anchor, rule)) return toDateStr(d);
  }
  return null;
}

/** A human, friendly label for a rule, e.g. "Every Mon, Wed, Fri" or "Monthly on the 15th". */
export function describeRecurrence(ruleOrStr: RecurrenceRule | string): string {
  const rule = typeof ruleOrStr === "string" ? parseRecurrenceRule(ruleOrStr) : ruleOrStr;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDay = rule.byDay.map((d) => names[d]);
  switch (rule.freq) {
    case "DAILY":
      return rule.interval === 1 ? "Every day" : `Every ${rule.interval} days`;
    case "WEEKLY":
      if (rule.byDay.length === 0)
        return rule.interval === 1 ? "Every week" : `Every ${rule.interval} weeks`;
      if (rule.interval === 1) return `Every ${byDay.join(", ")}`;
      return `Every ${rule.interval} weeks on ${byDay.join(", ")}`;
    case "MONTHLY": {
      const day = rule.byMonthDay[0];
      if (rule.interval === 1) return day ? `Monthly on the ${ordinal(day)}` : "Monthly";
      return day
        ? `Every ${rule.interval} months on the ${ordinal(day)}`
        : `Every ${rule.interval} months`;
    }
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
