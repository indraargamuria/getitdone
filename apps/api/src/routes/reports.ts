import { Hono } from "hono";
import { getDb, reportSummary } from "../db/queries";
import { requireUser } from "../middleware";
import type { AppEnv } from "../types";

export const reportRoutes = new Hono<AppEnv>();

reportRoutes.get("/", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json(await reportSummary(getDb(c.env.DB), user.id));
});
