import { tagInputSchema } from "@getitdone/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTag, deleteTag, getDb, listTags, updateTag } from "../db/queries";
import { requireUser } from "../middleware";
import type { AppEnv } from "../types";

export const tagRoutes = new Hono<AppEnv>();

tagRoutes.get("/", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const tags = await listTags(getDb(c.env.DB), user.id);
  return c.json({ tags });
});

tagRoutes.post("/", zValidator("json", tagInputSchema), async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const tag = await createTag(getDb(c.env.DB), user.id, c.req.valid("json"));
  return c.json({ tag }, 201);
});

tagRoutes.patch("/:id", zValidator("json", tagInputSchema.partial()), async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const tag = await updateTag(getDb(c.env.DB), user.id, c.req.param("id"), c.req.valid("json"));
  if (!tag) return c.json({ error: "Tag not found" }, 404);
  return c.json({ tag });
});

tagRoutes.delete("/:id", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const ok = await deleteTag(getDb(c.env.DB), user.id, c.req.param("id"));
  if (!ok) return c.json({ error: "Tag not found" }, 404);
  return c.json({ ok: true });
});
