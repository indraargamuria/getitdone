import { nowISO } from "@getitdone/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";
import {
  getDb,
  listAssignees,
  listCounts,
  listCountsByList,
  listLists,
  listTags,
} from "./db/queries";
import { csrfGuard, sessionMiddleware } from "./middleware";
import { authRoutes } from "./routes/auth";
import { listRoutes } from "./routes/lists";
import { reportRoutes } from "./routes/reports";
import { tagRoutes } from "./routes/tags";
import { taskRoutes } from "./routes/tasks";
import type { AppContext, DBEnv } from "./types";

export type AppEnv = { Bindings: DBEnv; Variables: AppContext };

export function createApp(env: DBEnv) {
  const app = new Hono<AppEnv>();

  app.use(
    "*",
    cors({
      origin: (origin) => {
        const allowed = (env.CORS_ORIGIN ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (allowed.length === 0) return "";
        return allowed.includes(origin ?? "") ? origin : "";
      },
      credentials: true,
      allowHeaders: ["Content-Type", "X-Requested-With"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use("*", sessionMiddleware);
  app.use("/api/*", csrfGuard);

  app.get("/api/health", async (c) => {
    let db = "ok";
    try {
      await c.env.DB.prepare("SELECT 1").run();
    } catch {
      db = "error";
    }
    return c.json({ status: "ok", db, app: "getitdone-api", time: nowISO() });
  });

  app.get("/api/bootstrap", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const db = getDb(c.env.DB);
    const [lists, tags, counts, perListCounts, assignees] = await Promise.all([
      listLists(db, user.id),
      listTags(db, user.id),
      listCounts(db, user.id),
      listCountsByList(db, user.id),
      listAssignees(db, user.id),
    ]);
    return c.json({ user, lists, tags, counts, listCounts: perListCounts, assignees });
  });

  app.route("/api/auth", authRoutes);
  app.route("/api/lists", listRoutes);
  app.route("/api/tags", tagRoutes);
  app.route("/api/tasks", taskRoutes);
  app.route("/api/reports", reportRoutes);

  app.notFound((c) => c.json({ error: "Not found" }, 404));

  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json({ error: "Validation failed", issues: err.issues }, 400);
    }
    console.error(err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
