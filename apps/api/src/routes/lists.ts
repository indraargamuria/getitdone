import { listInputSchema, reorderInputSchema } from "@getitdone/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import {
  createList,
  deleteList,
  getDb,
  listLists,
  listParentOk,
  listReparentOk,
  reorderLists,
  updateList,
} from "../db/queries";
import { requireUser } from "../middleware";
import type { AppEnv } from "../types";

export const listRoutes = new Hono<AppEnv>();

listRoutes.get("/", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const lists = await listLists(getDb(c.env.DB), user.id);
  return c.json({ lists });
});

listRoutes.post("/", zValidator("json", listInputSchema), async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const input = c.req.valid("json");
  if (!(await listParentOk(getDb(c.env.DB), user.id, input.parentId))) {
    return c.json({ error: "Parent list not found" }, 400);
  }
  const list = await createList(getDb(c.env.DB), user.id, input);
  return c.json({ list }, 201);
});

listRoutes.patch("/:id", zValidator("json", listInputSchema.partial()), async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const db = getDb(c.env.DB);
  const patch = c.req.valid("json");
  if (patch.parentId !== undefined) {
    if (!(await listReparentOk(db, user.id, c.req.param("id"), patch.parentId))) {
      return c.json({ error: "Cannot nest a list under itself or one of its sub-lists" }, 400);
    }
  }
  const list = await updateList(db, user.id, c.req.param("id"), patch);
  if (!list) return c.json({ error: "List not found" }, 404);
  return c.json({ list });
});

listRoutes.delete("/:id", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const ok = await deleteList(getDb(c.env.DB), user.id, c.req.param("id"));
  if (!ok) return c.json({ error: "List not found" }, 404);
  return c.json({ ok: true });
});

listRoutes.post("/reorder", zValidator("json", reorderInputSchema), async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  await reorderLists(getDb(c.env.DB), user.id, c.req.valid("json").orderedIds);
  return c.json({ ok: true });
});
