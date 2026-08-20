import {
  reorderInputSchema,
  subtaskUpdateInputSchema,
  taskCompleteInputSchema,
  taskCreateInputSchema,
  taskInputSchema,
  taskQuerySchema,
  taskTagInputSchema,
  validateTaskFields,
} from "@getitdone/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import {
  addTaskTag,
  createSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  getDb,
  getTask,
  queryTasks,
  removeTaskTag,
  reorderTasks,
  setSubtaskCompleted,
  setTaskCompleted,
  updateSubtask,
  updateTask,
} from "../db/queries";
import { requireUser } from "../middleware";
import type { AppEnv } from "../types";

export const taskRoutes = new Hono<AppEnv>();

/* ------------------------------- collection ------------------------------- */

taskRoutes.get("/", zValidator("query", taskQuerySchema), async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const q = c.req.valid("query");
  const tasks = await queryTasks(getDb(c.env.DB), user.id, {
    ...q,
    includeCompleted:
      q.includeCompleted === "true" ? true : q.includeCompleted === "false" ? false : undefined,
  });
  return c.json({ tasks });
});

taskRoutes.post("/", zValidator("json", taskCreateInputSchema), async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const input = c.req.valid("json");
  if (!validateTaskFields(input)) return c.json({ error: "Due time requires a due date" }, 400);
  const task = await createTask(getDb(c.env.DB), user.id, input);
  return c.json({ task }, 201);
});

/* ------------------------------ static subroutes ------------------------------ */

taskRoutes.post("/reorder", zValidator("json", reorderInputSchema), async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  await reorderTasks(getDb(c.env.DB), user.id, c.req.valid("json").orderedIds);
  return c.json({ ok: true });
});

taskRoutes.patch(
  "/subtasks/:subtaskId",
  zValidator("json", subtaskUpdateInputSchema),
  async (c) => {
    const user = requireUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { title } = c.req.valid("json");
    const sub = await updateSubtask(getDb(c.env.DB), user.id, c.req.param("subtaskId"), { title });
    if (!sub) return c.json({ error: "Subtask not found" }, 404);
    return c.json({ subtask: sub });
  },
);

taskRoutes.post("/subtasks/:subtaskId/complete", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const sub = await setSubtaskCompleted(getDb(c.env.DB), user.id, c.req.param("subtaskId"), true);
  if (!sub) return c.json({ error: "Subtask not found" }, 404);
  return c.json({ subtask: sub });
});

taskRoutes.post("/subtasks/:subtaskId/reopen", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const sub = await setSubtaskCompleted(getDb(c.env.DB), user.id, c.req.param("subtaskId"), false);
  if (!sub) return c.json({ error: "Subtask not found" }, 404);
  return c.json({ subtask: sub });
});

taskRoutes.delete("/subtasks/:subtaskId", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const ok = await deleteSubtask(getDb(c.env.DB), user.id, c.req.param("subtaskId"));
  if (!ok) return c.json({ error: "Subtask not found" }, 404);
  return c.json({ ok: true });
});

/* ------------------------------- single task ------------------------------- */

taskRoutes.get("/:id", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const task = await getTask(getDb(c.env.DB), user.id, c.req.param("id"));
  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json({ task });
});

taskRoutes.patch("/:id", zValidator("json", taskInputSchema), async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const patch = c.req.valid("json");
  if (!validateTaskFields(patch)) return c.json({ error: "Due time requires a due date" }, 400);
  const task = await updateTask(getDb(c.env.DB), user.id, c.req.param("id"), patch);
  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json({ task });
});

taskRoutes.delete("/:id", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const ok = await deleteTask(getDb(c.env.DB), user.id, c.req.param("id"));
  if (!ok) return c.json({ error: "Task not found" }, 404);
  return c.json({ ok: true });
});

taskRoutes.post("/:id/complete", zValidator("json", taskCompleteInputSchema), async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const completed = c.req.valid("json").completed ?? true;
  const result = await setTaskCompleted(getDb(c.env.DB), user.id, c.req.param("id"), completed);
  if (!result) return c.json({ error: "Task not found" }, 404);
  return c.json(result);
});

taskRoutes.post("/:id/tags", zValidator("json", taskTagInputSchema), async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const ok = await addTaskTag(
    getDb(c.env.DB),
    user.id,
    c.req.param("id"),
    c.req.valid("json").tagId,
  );
  if (!ok) return c.json({ error: "Task not found" }, 404);
  return c.json({ ok: true });
});

taskRoutes.delete("/:id/tags/:tagId", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const ok = await removeTaskTag(getDb(c.env.DB), user.id, c.req.param("id"), c.req.param("tagId"));
  if (!ok) return c.json({ error: "Task not found" }, 404);
  return c.json({ ok: true });
});

taskRoutes.post(
  "/:id/subtasks",
  zValidator("json", taskInputSchema.pick({ title: true }).required()),
  async (c) => {
    const user = requireUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const sub = await createSubtask(
      getDb(c.env.DB),
      user.id,
      c.req.param("id"),
      c.req.valid("json").title,
    );
    if (!sub) return c.json({ error: "Task not found" }, 404);
    return c.json({ subtask: sub }, 201);
  },
);
