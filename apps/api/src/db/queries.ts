import type { D1Database } from "@cloudflare/workers-types";
import {
  addDaysStr,
  type List,
  type ListInput,
  newId,
  nextOccurrenceAfter,
  nowISO,
  type Subtask,
  startOfToday,
  type Tag,
  type Task,
  type TaskCreateInput,
  type TaskInput,
} from "@getitdone/shared";
import type { SQL } from "drizzle-orm";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { lists, sessions, subtasks, tags, tasks, taskTags, users } from "./schema";

export type DB = DrizzleD1Database<Record<string, never>>;

export function getDb(binding: D1Database): DB {
  return drizzle(binding);
}

/* ------------------------------ users/sessions ------------------------------ */

export async function getUserByEmail(db: DB, email: string) {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export async function getUserById(db: DB, id: string) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export async function createUser(
  db: DB,
  input: { email: string; passwordHash: string; displayName?: string },
) {
  const id = newId();
  await db.insert(users).values({
    id,
    email: input.email,
    passwordHash: input.passwordHash,
    displayName: input.displayName ?? null,
    createdAt: nowISO(),
  });
  return getUserById(db, id);
}

export async function createSession(db: DB, userId: string, id: string, expiresAt: string) {
  await db.insert(sessions).values({ id, userId, createdAt: nowISO(), expiresAt });
}

export async function getSessionWithUser(db: DB, token: string) {
  const row = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, token))
    .get();
  if (!row) return null;
  if (row.session.expiresAt < nowISO()) return null;
  return row;
}

export async function deleteSession(db: DB, token: string) {
  await db.delete(sessions).where(eq(sessions.id, token));
}

export async function deleteSessionsForUser(db: DB, userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/* ----------------------------------- lists ----------------------------------- */

export async function getList(db: DB, userId: string, id: string): Promise<List | null> {
  const row = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)))
    .get();
  return row ? toList(row) : null;
}

/** All descendant list ids under `rootId` (children, grandchildren, …), depth-first. */
export async function listDescendantIds(db: DB, userId: string, rootId: string): Promise<string[]> {
  const rows = await db
    .select({ id: lists.id, parentId: lists.parentId })
    .from(lists)
    .where(eq(lists.userId, userId));
  const childrenOf = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.parentId) continue;
    const arr = childrenOf.get(r.parentId) ?? [];
    arr.push(r.id);
    childrenOf.set(r.parentId, arr);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const child of childrenOf.get(cur) ?? []) {
      out.push(child);
      stack.push(child);
    }
  }
  return out;
}

/** A list can only be nested under a list the user owns (or removed entirely). */
export async function listParentOk(
  db: DB,
  userId: string,
  parentId: string | null | undefined,
): Promise<boolean> {
  if (!parentId) return true;
  return (await getList(db, userId, parentId)) !== null;
}

/** Reparenting must not create a cycle (list under itself or its own descendant). */
export async function listReparentOk(
  db: DB,
  userId: string,
  id: string,
  parentId: string | null,
): Promise<boolean> {
  if (!parentId) return true;
  if (parentId === id) return false;
  if (!(await listParentOk(db, userId, parentId))) return false;
  const descendants = await listDescendantIds(db, userId, id);
  return !descendants.includes(parentId);
}

export async function listLists(db: DB, userId: string): Promise<List[]> {
  const rows = await db
    .select()
    .from(lists)
    .where(eq(lists.userId, userId))
    .orderBy(asc(lists.sortOrder), asc(lists.name));
  return rows.map(toList);
}

export async function createList(db: DB, userId: string, input: ListInput): Promise<List> {
  const parentId = input.parentId ?? null;
  const max = await db
    .select({ max: sql<number>`max(${lists.sortOrder})` })
    .from(lists)
    .where(
      and(
        eq(lists.userId, userId),
        parentId ? eq(lists.parentId, parentId) : isNull(lists.parentId),
      ),
    )
    .get();
  const row = await db
    .insert(lists)
    .values({
      id: newId(),
      userId,
      name: input.name,
      color: input.color ?? "#5B6EE8",
      icon: input.icon ?? null,
      parentId,
      sortOrder: (max?.max ?? 0) + 1,
      createdAt: nowISO(),
    })
    .returning()
    .get();
  return toList(row);
}

export async function updateList(
  db: DB,
  userId: string,
  id: string,
  patch: Partial<Pick<ListInput, "name" | "color" | "icon" | "parentId" | "sortOrder">>,
): Promise<List | null> {
  const existing = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)))
    .get();
  if (!existing) return null;
  const row = await db
    .update(lists)
    .set(patch)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)))
    .returning()
    .get();
  return toList(row);
}

export async function deleteList(db: DB, userId: string, id: string): Promise<boolean> {
  const res = await db
    .delete(lists)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)))
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function reorderLists(db: DB, userId: string, orderedIds: string[]): Promise<void> {
  for (let idx = 0; idx < orderedIds.length; idx++) {
    await db
      .update(lists)
      .set({ sortOrder: idx })
      .where(and(eq(lists.id, orderedIds[idx] ?? ""), eq(lists.userId, userId)));
  }
}

/* ------------------------------------ tags ----------------------------------- */

export async function listTags(db: DB, userId: string): Promise<Tag[]> {
  const rows = await db.select().from(tags).where(eq(tags.userId, userId)).orderBy(asc(tags.name));
  return rows.map(toTag);
}

export async function createTag(
  db: DB,
  userId: string,
  input: { name: string; color?: string },
): Promise<Tag> {
  const row = await db
    .insert(tags)
    .values({
      id: newId(),
      userId,
      name: input.name,
      color: input.color ?? "#5B6EE8",
      createdAt: nowISO(),
    })
    .returning()
    .get();
  return toTag(row);
}

export async function updateTag(
  db: DB,
  userId: string,
  id: string,
  patch: { name?: string; color?: string },
): Promise<Tag | null> {
  const existing = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)))
    .get();
  if (!existing) return null;
  const row = await db
    .update(tags)
    .set(patch)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)))
    .returning()
    .get();
  return toTag(row);
}

export async function deleteTag(db: DB, userId: string, id: string): Promise<boolean> {
  const res = await db
    .delete(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)))
    .run();
  return (res.meta.changes ?? 0) > 0;
}

/* ---------------------------------- tasks ---------------------------------- */

export interface TaskRelations {
  tags: Tag[];
  subtasks: Subtask[];
}

export type TaskWithRelations = Task & TaskRelations;

function toList(r: typeof lists.$inferSelect): List {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    parentId: r.parentId,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
  };
}

function toTag(r: typeof tags.$inferSelect): Tag {
  return { id: r.id, name: r.name, color: r.color, createdAt: r.createdAt };
}

function toTask(r: typeof tasks.$inferSelect): Task {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    listId: r.listId,
    priority: r.priority as Task["priority"],
    dueDate: r.dueDate,
    dueTime: r.dueTime,
    completedAt: r.completedAt,
    recurrence: r.recurrence,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toSubtask(r: typeof subtasks.$inferSelect): Subtask {
  return {
    id: r.id,
    taskId: r.taskId,
    title: r.title,
    completedAt: r.completedAt,
    sortOrder: r.sortOrder,
  };
}

async function attachRelations(
  db: DB,
  userId: string,
  taskRows: Array<typeof tasks.$inferSelect>,
): Promise<TaskWithRelations[]> {
  if (taskRows.length === 0) return [];
  const ids = taskRows.map((t) => t.id);

  const tagRows = await db
    .select({ tag: tags, taskId: taskTags.taskId })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .innerJoin(tasks, eq(taskTags.taskId, tasks.id))
    .where(and(inArray(taskTags.taskId, ids), eq(tasks.userId, userId)));

  const subtaskRows = await db
    .select()
    .from(subtasks)
    .where(inArray(subtasks.taskId, ids))
    .orderBy(asc(subtasks.sortOrder));

  const tagsByTask = new Map<string, Tag[]>();
  for (const row of tagRows) {
    const arr = tagsByTask.get(row.taskId) ?? [];
    arr.push(toTag(row.tag));
    tagsByTask.set(row.taskId, arr);
  }
  const subsByTask = new Map<string, Subtask[]>();
  for (const row of subtaskRows) {
    const arr = subsByTask.get(row.taskId) ?? [];
    arr.push(toSubtask(row));
    subsByTask.set(row.taskId, arr);
  }

  return taskRows.map((t) => ({
    ...toTask(t),
    tags: tagsByTask.get(t.id) ?? [],
    subtasks: subsByTask.get(t.id) ?? [],
  }));
}

export interface TaskQueryParams {
  view?: "today" | "week" | "inbox" | "all" | "completed";
  listId?: string;
  tagId?: string;
  q?: string;
  includeCompleted?: boolean;
}

const orderByOpen = [
  sql`CASE WHEN ${tasks.dueDate} IS NULL THEN 1 ELSE 0 END`,
  asc(tasks.dueDate),
  asc(tasks.dueTime),
  asc(tasks.sortOrder),
  asc(tasks.createdAt),
];

export async function queryTasks(db: DB, userId: string, params: TaskQueryParams = {}) {
  const conds = [eq(tasks.userId, userId)];
  const today = startOfToday();

  if (params.view === "completed") {
    conds.push(sql`${tasks.completedAt} IS NOT NULL`);
  } else {
    const showCompleted = params.includeCompleted ?? false;
    if (!showCompleted) conds.push(isNull(tasks.completedAt));
  }

  if (params.view === "today") conds.push(eq(tasks.dueDate, today));
  if (params.view === "week") conds.push(gte(tasks.dueDate, today));
  if (params.view === "week") conds.push(lt(tasks.dueDate, addDaysStr(today, 7)));
  if (params.view === "inbox") conds.push(isNull(tasks.listId));
  if (params.listId) {
    const listIds = [params.listId, ...(await listDescendantIds(db, userId, params.listId))];
    conds.push(inArray(tasks.listId, listIds));
  }
  if (params.tagId)
    conds.push(
      inArray(
        tasks.id,
        db.select({ id: taskTags.taskId }).from(taskTags).where(eq(taskTags.tagId, params.tagId)),
      ),
    );
  if (params.q) {
    const likeQ = `%${params.q}%`;
    conds.push(or(like(tasks.title, likeQ), like(tasks.notes, likeQ))!);
  }

  const order = params.view === "completed" ? [desc(tasks.completedAt)] : orderByOpen;

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conds))
    .orderBy(...order);
  return attachRelations(db, userId, rows);
}

export async function getTask(
  db: DB,
  userId: string,
  id: string,
): Promise<TaskWithRelations | null> {
  const row = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .get();
  if (!row) return null;
  const [withRel] = await attachRelations(db, userId, [row]);
  return withRel ?? null;
}

export async function createTask(
  db: DB,
  userId: string,
  input: TaskCreateInput & { listId?: string | null },
): Promise<TaskWithRelations> {
  const now = nowISO();
  const row = await db
    .insert(tasks)
    .values({
      id: newId(),
      userId,
      title: input.title,
      notes: input.notes ?? null,
      listId: input.listId ?? null,
      priority: input.priority ?? 4,
      dueDate: input.dueDate ?? null,
      dueTime: input.dueTime ?? null,
      recurrence: input.recurrence ?? null,
      sortOrder: input.sortOrder ?? Date.now(),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  if (input.tagIds && input.tagIds.length > 0) {
    await db.insert(taskTags).values(input.tagIds.map((tagId) => ({ taskId: row.id, tagId })));
  }
  if (input.subtasks && input.subtasks.length > 0) {
    await db.insert(subtasks).values(
      input.subtasks.map((title, idx) => ({
        id: newId(),
        taskId: row.id,
        title,
        sortOrder: idx,
      })),
    );
  }
  return (await getTask(db, userId, row.id))!;
}

export async function updateTask(
  db: DB,
  userId: string,
  id: string,
  patch: TaskInput,
): Promise<TaskWithRelations | null> {
  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .get();
  if (!existing) return null;
  const clean: Record<string, unknown> = { updatedAt: nowISO() };
  for (const key of [
    "title",
    "notes",
    "listId",
    "priority",
    "dueDate",
    "dueTime",
    "recurrence",
  ] as const) {
    if (patch[key] !== undefined) clean[key] = patch[key];
  }
  await db
    .update(tasks)
    .set(clean)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  return getTask(db, userId, id);
}

export async function deleteTask(db: DB, userId: string, id: string): Promise<boolean> {
  const res = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function setTaskCompleted(
  db: DB,
  userId: string,
  id: string,
  completed: boolean,
): Promise<{ task: TaskWithRelations; next?: TaskWithRelations } | null> {
  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .get();
  if (!existing) return null;

  const now = nowISO();
  let next: TaskWithRelations | undefined;

  if (completed && !existing.completedAt && existing.recurrence) {
    const today = startOfToday();
    const anchor = existing.dueDate && existing.dueDate >= today ? existing.dueDate : today;
    const nextDate = nextOccurrenceAfter(existing.recurrence, anchor);
    if (nextDate) {
      const nextId = newId();
      await db
        .insert(tasks)
        .values({
          id: nextId,
          userId,
          title: existing.title,
          notes: existing.notes,
          listId: existing.listId,
          priority: existing.priority,
          dueDate: nextDate,
          dueTime: existing.dueTime,
          recurrence: existing.recurrence,
          sortOrder: existing.sortOrder,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      const tagRows = await db
        .select({ tagId: taskTags.tagId })
        .from(taskTags)
        .where(eq(taskTags.taskId, existing.id));
      if (tagRows.length > 0) {
        await db.insert(taskTags).values(tagRows.map((r) => ({ taskId: nextId, tagId: r.tagId })));
      }
      next = (await getTask(db, userId, nextId)) ?? undefined;
    }
  }

  const updated = await db
    .update(tasks)
    .set({ completedAt: completed ? now : null, updatedAt: now })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning()
    .get();

  const result: { task: TaskWithRelations; next?: TaskWithRelations } = {
    task: (await getTask(db, userId, updated!.id))!,
  };
  if (next) result.next = next;
  return result;
}

export async function reorderTasks(db: DB, userId: string, orderedIds: string[]): Promise<void> {
  for (let idx = 0; idx < orderedIds.length; idx++) {
    await db
      .update(tasks)
      .set({ sortOrder: idx, updatedAt: nowISO() })
      .where(and(eq(tasks.id, orderedIds[idx] ?? ""), eq(tasks.userId, userId)));
  }
}

export async function addTaskTag(
  db: DB,
  userId: string,
  taskId: string,
  tagId: string,
): Promise<boolean> {
  const task = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .get();
  if (!task) return false;
  await db.insert(taskTags).values({ taskId, tagId });
  return true;
}

export async function removeTaskTag(
  db: DB,
  userId: string,
  taskId: string,
  tagId: string,
): Promise<boolean> {
  const task = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .get();
  if (!task) return false;
  await db.delete(taskTags).where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)));
  return true;
}

/* --------------------------------- subtasks --------------------------------- */

export async function createSubtask(
  db: DB,
  userId: string,
  taskId: string,
  title: string,
): Promise<Subtask | null> {
  const task = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .get();
  if (!task) return null;
  const max = await db
    .select({ max: sql<number>`max(${subtasks.sortOrder})` })
    .from(subtasks)
    .where(eq(subtasks.taskId, taskId))
    .get();
  const row = await db
    .insert(subtasks)
    .values({ id: newId(), taskId, title, sortOrder: (max?.max ?? 0) + 1 })
    .returning()
    .get();
  return toSubtask(row);
}

export async function updateSubtask(
  db: DB,
  userId: string,
  id: string,
  patch: { title?: string; completedAt?: string | null },
): Promise<Subtask | null> {
  const existing = await db
    .select({ st: subtasks })
    .from(subtasks)
    .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
    .where(and(eq(subtasks.id, id), eq(tasks.userId, userId)))
    .get();
  if (!existing) return null;
  const row = await db.update(subtasks).set(patch).where(eq(subtasks.id, id)).returning().get();
  return toSubtask(row);
}

export async function deleteSubtask(db: DB, userId: string, id: string): Promise<boolean> {
  const existing = await db
    .select({ st: subtasks.id })
    .from(subtasks)
    .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
    .where(and(eq(subtasks.id, id), eq(tasks.userId, userId)))
    .get();
  if (!existing) return false;
  const res = await db.delete(subtasks).where(eq(subtasks.id, id)).run();
  return (res.meta.changes ?? 0) > 0;
}

export async function setSubtaskCompleted(
  db: DB,
  userId: string,
  id: string,
  completed: boolean,
): Promise<Subtask | null> {
  return updateSubtask(db, userId, id, { completedAt: completed ? nowISO() : null });
}

/* ---------------------------------- counts ---------------------------------- */

export async function listCounts(
  db: DB,
  userId: string,
): Promise<{ today: number; week: number; inbox: number; all: number; completed: number }> {
  const today = startOfToday();
  const count = async (cond?: SQL) => {
    const row = await db
      .select({ n: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), ...(cond ? [cond] : [])))
      .get();
    return Number(row?.n ?? 0);
  };
  const [todayC, weekC, inboxC, allC, completedC] = await Promise.all([
    count(eq(tasks.dueDate, today)),
    count(
      and(
        gte(tasks.dueDate, today),
        lt(tasks.dueDate, addDaysStr(today, 7)),
        isNull(tasks.completedAt),
      ),
    ),
    count(and(isNull(tasks.listId), isNull(tasks.completedAt))),
    count(isNull(tasks.completedAt)),
    count(isNotNull(tasks.completedAt)),
  ]);
  return { today: todayC, week: weekC, inbox: inboxC, all: allC, completed: completedC };
}
