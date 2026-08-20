import { z } from "zod";
import { isValidDateStr, isValidTimeStr } from "./dates";

export const ID = z.string().min(1).max(64);

const dateStr = z.string().refine(isValidDateStr, { message: "expected YYYY-MM-DD" });
const timeStr = z.string().refine(isValidTimeStr, { message: "expected HH:mm" });
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "expected hex color");

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(8).max(128);

export const userSchema = z.object({
  id: ID,
  email: emailSchema,
  displayName: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const sessionSchema = z.object({
  id: ID,
  userId: ID,
  createdAt: z.string(),
  expiresAt: z.string(),
});

export const signupInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(60).optional(),
});

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const listSchema = z.object({
  id: ID,
  name: z.string().trim().min(1).max(80),
  color: hexColor,
  icon: z.string().max(8).nullable(),
  parentId: z.string().nullable(),
  sortOrder: z.number(),
  createdAt: z.string(),
});

export const listInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: hexColor.optional(),
  icon: z.string().max(8).nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

export const tagSchema = z.object({
  id: ID,
  name: z.string().trim().min(1).max(40),
  color: hexColor,
  createdAt: z.string(),
});

export const tagInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: hexColor.optional(),
});

export const subtaskSchema = z.object({
  id: ID,
  taskId: ID,
  title: z.string().trim().min(1).max(200),
  completedAt: z.string().nullable(),
  sortOrder: z.number(),
});

export const SUBTASK_TITLE_MAX = 200;

export const subtaskInputSchema = z.object({
  title: z.string().trim().min(1).max(SUBTASK_TITLE_MAX),
  completedAt: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

/** Payload for renaming a subtask: PATCH /api/tasks/subtasks/:id */
export const subtaskUpdateInputSchema = z.object({
  title: z.string().trim().min(1).max(SUBTASK_TITLE_MAX),
});

/** Priority: 1 = highest (P1) … 4 = none (P4). */
export const prioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

export const TASK_TITLE_MAX = 500;
export const ASSIGNEE_MAX = 80;

export const taskSchema = z.object({
  id: ID,
  title: z.string().trim().min(1).max(TASK_TITLE_MAX),
  notes: z.string().max(20_000).nullable(),
  listId: ID.nullable(),
  priority: prioritySchema,
  dueDate: dateStr.nullable(),
  dueTime: timeStr.nullable(),
  completedAt: z.string().nullable(),
  assignee: z.string().max(ASSIGNEE_MAX).nullable(),
  recurrence: z.string().max(200).nullable(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(TASK_TITLE_MAX).optional(),
  notes: z.string().max(20_000).nullable().optional(),
  listId: ID.nullable().optional(),
  priority: prioritySchema.optional(),
  dueDate: dateStr.nullable().optional(),
  dueTime: timeStr.nullable().optional(),
  completedAt: z.string().nullable().optional(),
  assignee: z.string().max(ASSIGNEE_MAX).nullable().optional(),
  recurrence: z.string().max(200).nullable().optional(),
  sortOrder: z.number().optional(),
});

/** Cross-field guard: a time without a date is meaningless. */
export function validateTaskFields(input: {
  dueTime?: string | null;
  dueDate?: string | null;
}): boolean {
  return !(input.dueTime && !input.dueDate);
}

export const taskCreateInputSchema = taskInputSchema.extend({
  title: z.string().trim().min(1).max(TASK_TITLE_MAX),
  tagIds: z.array(ID).optional(),
  subtasks: z.array(z.string().trim().min(1).max(200)).optional(),
});

export const taskCompleteInputSchema = z.object({
  completed: z.boolean().optional(),
});

export const reorderInputSchema = z.object({
  orderedIds: z.array(ID),
  listId: ID.nullable().optional(),
});

export const taskQuerySchema = z.object({
  view: z.enum(["today", "week", "inbox", "all", "completed"]).optional(),
  listId: ID.optional(),
  tagId: ID.optional(),
  q: z.string().max(200).optional(),
  includeCompleted: z.enum(["true", "false"]).optional(),
});

export const taskTagInputSchema = z.object({
  tagId: ID,
});

export const reportSummarySchema = z.object({
  totals: z.object({
    total: z.number(),
    open: z.number(),
    completed: z.number(),
    inbox: z.number(),
  }),
  byList: z.array(
    z.object({
      list: listSchema,
      open: z.number(),
      completed: z.number(),
      total: z.number(),
    }),
  ),
});

export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type List = z.infer<typeof listSchema>;
export type ListInput = z.infer<typeof listInputSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type TagInput = z.infer<typeof tagInputSchema>;
export type Subtask = z.infer<typeof subtaskSchema>;
export type SubtaskUpdateInput = z.infer<typeof subtaskUpdateInputSchema>;
export type Task = z.infer<typeof taskSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateInputSchema>;
export type ReportSummary = z.infer<typeof reportSummarySchema>;

export function newId(): string {
  return crypto.randomUUID();
}

export interface SubtaskLike {
  completedAt: string | null;
}

export interface TaskLike {
  completedAt: string | null;
  subtasks?: SubtaskLike[];
}

/**
 * A task's effective completion. When a task has subtasks, completion is
 * derived from the lowest level: it counts as done only when every subtask is
 * done (its own `completedAt` is ignored for counting purposes).
 */
export function effectiveTaskDone(task: TaskLike): boolean {
  const subs = task.subtasks;
  if (subs && subs.length > 0) return subs.every((s) => s.completedAt);
  return !!task.completedAt;
}

/** Progress of a task's subtasks: `{ done, total }` where `total` is the count. */
export function subtaskProgress(subtasks: SubtaskLike[]): { done: number; total: number } {
  return {
    done: subtasks.filter((s) => s.completedAt).length,
    total: subtasks.length,
  };
}

/** 0–100 completion percentage for a set of items (empty set = 0). */
export function completionPct(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}
