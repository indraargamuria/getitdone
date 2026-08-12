import { describe, expect, it } from "vitest";
import {
  addDaysStr,
  daysFromToday,
  humanDateLabel,
  humanDueLabel,
  isValidDateStr,
  startOfToday,
  toDateStr,
} from "./dates";

describe("dates", () => {
  it("round-trips a date string in local time", () => {
    const s = "2026-08-06";
    expect(isValidDateStr(s)).toBe(true);
    expect(toDateStr(new Date(2026, 7, 6, 23, 59))).toBe(s);
    expect(isValidDateStr("2026-02-30")).toBe(false);
    expect(isValidDateStr("2026-8-6")).toBe(false);
  });

  it("adds days across month boundaries", () => {
    expect(addDaysStr("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysStr("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysStr("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("labels dates relative to today", () => {
    const now = new Date(2026, 7, 6, 12, 0);
    expect(humanDueLabel("2026-08-06", now)).toBe("Today");
    expect(humanDueLabel("2026-08-07", now)).toBe("Tomorrow");
    expect(humanDueLabel("2026-08-05", now)).toBe("Yesterday");
    expect(daysFromToday(startOfToday())).toBe(0);
  });

  it("labels an ISO completion timestamp by its local date", () => {
    const today = new Date();
    const todayIso = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      15,
      30,
    ).toISOString();
    expect(humanDateLabel(todayIso)).toBe("Today");
    expect(humanDateLabel("not-a-date")).toBe("");
  });
});
