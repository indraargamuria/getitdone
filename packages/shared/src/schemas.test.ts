import { describe, expect, it } from "vitest";
import { taskCreateInputSchema, taskInputSchema, validateTaskFields } from "./schemas";

describe("task schemas", () => {
  it("accepts a valid create input", () => {
    const parsed = taskCreateInputSchema.parse({
      title: "Buy milk",
      dueDate: "2026-08-07",
      dueTime: "17:00",
      priority: 2,
      tagIds: ["t1"],
    });
    expect(parsed.title).toBe("Buy milk");
  });

  it("rejects an empty title", () => {
    expect(() => taskCreateInputSchema.parse({ title: "   " })).toThrow();
  });

  it("rejects a time without a date", () => {
    expect(validateTaskFields({ dueTime: "17:00" })).toBe(false);
    expect(validateTaskFields({ dueTime: "17:00", dueDate: "2026-08-07" })).toBe(true);
  });

  it("rejects invalid priority", () => {
    expect(() => taskInputSchema.parse({ priority: 5 })).toThrow();
  });
});
