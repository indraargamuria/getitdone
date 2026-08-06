import type { Context, MiddlewareHandler } from "hono";
import { getSessionToken } from "./auth";
import { getDb, getSessionWithUser } from "./db/queries";
import type { AppEnv } from "./types";

/** Loads the session from the cookie and attaches `user` to the context. */
export const sessionMiddleware: MiddlewareHandler = async (c, next) => {
  const token = getSessionToken(c);
  if (token) {
    const row = await getSessionWithUser(getDb(c.env.DB), token);
    if (row) {
      c.set("user", {
        id: row.user.id,
        email: row.user.email,
        displayName: row.user.displayName,
      });
    }
  }
  await next();
};

export function requireUser(c: Context<AppEnv>) {
  return c.get("user") ?? null;
}

const MUTATIONS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF defence-in-depth: browser-based cross-site requests cannot set custom
 * headers, so mutating endpoints require `X-Requested-With: getitdone`.
 * The web client always sends it; cross-origin fetches must pass the CORS
 * allowlist preflight first.
 */
export const csrfGuard: MiddlewareHandler = async (c, next) => {
  if (MUTATIONS.has(c.req.method)) {
    const header = c.req.header("x-requested-with");
    if (header !== "getitdone") {
      return c.json({ error: "Missing required X-Requested-With header" }, 403);
    }
  }
  await next();
};
