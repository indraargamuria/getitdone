import { describe, expect, it } from "vitest";
import {
  describeRecurrence,
  nextOccurrenceAfter,
  parseRecurrenceRule,
  serializeRecurrenceRule,
} from "./recurrence";

describe("recurrence", () => {
  it("parses and serializes a rule", () => {
    const rule = parseRecurrenceRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR");
    expect(rule.freq).toBe("WEEKLY");
    expect(rule.interval).toBe(2);
    expect(rule.byDay).toEqual([1, 3, 5]);
    expect(serializeRecurrenceRule(rule)).toBe("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR");
  });

  it("parses UNTIL into YYYY-MM-DD", () => {
    const rule = parseRecurrenceRule("FREQ=DAILY;UNTIL=20260831");
    expect(rule.until).toBe("2026-08-31");
  });

  it("daily: next day after anchor", () => {
    expect(nextOccurrenceAfter("FREQ=DAILY", "2026-08-06")).toBe("2026-08-07");
  });

  it("daily with interval 2: skips a day", () => {
    expect(nextOccurrenceAfter("FREQ=DAILY;INTERVAL=2", "2026-08-06")).toBe("2026-08-08");
  });

  it("weekly same weekday: +7 days", () => {
    expect(nextOccurrenceAfter("FREQ=WEEKLY", "2026-08-06")).toBe("2026-08-13");
  });

  it("weekly byday: Wednesday -> Friday -> next Monday", () => {
    const rule = "FREQ=WEEKLY;BYDAY=MO,WE,FR";
    expect(nextOccurrenceAfter(rule, "2026-08-05")).toBe("2026-08-07"); // Wed -> Fri
    expect(nextOccurrenceAfter(rule, "2026-08-07")).toBe("2026-08-10"); // Fri -> Mon
    expect(nextOccurrenceAfter(rule, "2026-08-10")).toBe("2026-08-12"); // Mon -> Wed
  });

  it("weekly byday with interval 2", () => {
    const rule = "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO";
    expect(nextOccurrenceAfter(rule, "2026-08-03")).toBe("2026-08-17"); // 2 weeks later
  });

  it("monthly same day-of-month", () => {
    expect(nextOccurrenceAfter("FREQ=MONTHLY", "2026-08-15")).toBe("2026-09-15");
  });

  it("monthly bymonthday clamps short months", () => {
    const rule = "FREQ=MONTHLY;BYMONTHDAY=31";
    expect(nextOccurrenceAfter(rule, "2026-01-31")).toBe("2026-02-28");
    expect(nextOccurrenceAfter(rule, "2026-02-28")).toBe("2026-03-31");
  });

  it("monthly with interval 3", () => {
    expect(nextOccurrenceAfter("FREQ=MONTHLY;INTERVAL=3", "2026-08-06")).toBe("2026-11-06");
  });

  it("respects UNTIL", () => {
    const rule = "FREQ=DAILY;UNTIL=20260808";
    expect(nextOccurrenceAfter(rule, "2026-08-07")).toBe("2026-08-08");
    expect(nextOccurrenceAfter(rule, "2026-08-08")).toBeNull();
  });

  it("describes rules readably", () => {
    expect(describeRecurrence("FREQ=DAILY")).toBe("Every day");
    expect(describeRecurrence("FREQ=WEEKLY;BYDAY=MO,WE,FR")).toBe("Every Mon, Wed, Fri");
    expect(describeRecurrence("FREQ=MONTHLY;BYMONTHDAY=15")).toBe("Monthly on the 15th");
    expect(describeRecurrence("FREQ=MONTHLY;INTERVAL=3")).toBe("Every 3 months");
  });
});
