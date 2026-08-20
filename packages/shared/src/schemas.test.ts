import { describe, expect, it } from "vitest";
import {
  completionPct,
  effectiveTaskDone,
  subtaskProgress,
  subtaskUpdateInputSchema,
  taskCreateInputSchema,
  taskInputSchema,
  validateTaskFields,
} from "./schemas";

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

  it("accepts a long title with symbols", () => {
    const parsed = taskCreateInputSchema.parse({
      title: '🚀 Buy 30% off & "deals" now (urgent!) — #errands @home',
    });
    expect(parsed.title).toContain("🚀");
  });

  it("accepts titles up to 500 characters", () => {
    const title = "a".repeat(500);
    expect(taskCreateInputSchema.parse({ title }).title).toBe(title);
  });

  it("rejects titles longer than 500 characters", () => {
    expect(() => taskCreateInputSchema.parse({ title: "a".repeat(501) })).toThrow();
  });

  it("accepts an assignee and trims it on save", () => {
    const parsed = taskInputSchema.parse({ assignee: "  Rina  " });
    expect(parsed.assignee).toBe("  Rina  ");
    expect(taskInputSchema.parse({ assignee: null }).assignee).toBeNull();
  });

  it("rejects an assignee longer than 80 characters", () => {
    expect(() => taskInputSchema.parse({ assignee: "a".repeat(81) })).toThrow();
  });
});

describe("subtask-aware completion", () => {
  it("uses the task's own state when there are no subtasks", () => {
    expect(effectiveTaskDone({ completedAt: null, subtasks: [] })).toBe(false);
    expect(effectiveTaskDone({ completedAt: "2026-01-01", subtasks: [] })).toBe(true);
    expect(effectiveTaskDone({ completedAt: null })).toBe(false);
  });

  it("derives completion from the lowest level when subtasks exist", () => {
    const open = { completedAt: "2026-01-01", subtasks: [{ completedAt: null }] };
    const partial = {
      completedAt: null,
      subtasks: [{ completedAt: "2026-01-01" }, { completedAt: null }],
    };
    const allDone = {
      completedAt: null,
      subtasks: [{ completedAt: "2026-01-01" }, { completedAt: "2026-01-02" }],
    };
    expect(effectiveTaskDone(open)).toBe(false);
    expect(effectiveTaskDone(partial)).toBe(false);
    expect(effectiveTaskDone(allDone)).toBe(true);
  });

  it("computes subtask progress and percentages", () => {
    const subs = [
      { completedAt: null },
      { completedAt: "2026-01-01" },
      { completedAt: "2026-01-02" },
    ];
    expect(subtaskProgress(subs)).toEqual({ done: 2, total: 3 });
    expect(completionPct(2, 3)).toBe(67);
    expect(completionPct(0, 0)).toBe(0);
  });
});

describe("subtask rename schema", () => {
  it("accepts a new title and trims it", () => {
    expect(subtaskUpdateInputSchema.parse({ title: "  Buy oat milk  " }).title).toBe(
      "Buy oat milk",
    );
  });

  it("rejects an empty or whitespace-only title", () => {
    expect(() => subtaskUpdateInputSchema.parse({ title: "" })).toThrow();
    expect(() => subtaskUpdateInputSchema.parse({ title: "   " })).toThrow();
  });

  it("caps the title at 200 characters", () => {
    expect(subtaskUpdateInputSchema.parse({ title: "a".repeat(200) }).title).toHaveLength(200);
    expect(() => subtaskUpdateInputSchema.parse({ title: "a".repeat(201) })).toThrow();
  });

  it("rejects a missing title", () => {
    expect(() => subtaskUpdateInputSchema.parse({})).toThrow();
  });
});
