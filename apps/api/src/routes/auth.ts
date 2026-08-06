import { loginInputSchema, signupInputSchema, type User } from "@getitdone/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import {
  clearSessionCookie,
  hashPassword,
  newSessionId,
  sessionExpiry,
  setSessionCookie,
  verifyPassword,
} from "../auth";
import {
  createSession,
  createUser,
  deleteSession,
  getDb,
  getUserByEmail,
  getUserById,
} from "../db/queries";
import { requireUser } from "../middleware";
import type { AppEnv } from "../types";

export const authRoutes = new Hono<AppEnv>();

function toPublicUser(u: {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}): User {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName ?? undefined,
    createdAt: u.createdAt,
  };
}

authRoutes.get("/me", async (c) => {
  const user = requireUser(c);
  if (!user) return c.json({ error: "Not signed in" }, 401);
  const row = await getUserById(getDb(c.env.DB), user.id);
  if (!row) return c.json({ error: "Not signed in" }, 401);
  return c.json({ user: toPublicUser(row) });
});

authRoutes.post("/signup", zValidator("json", signupInputSchema), async (c) => {
  const { email, password, displayName } = c.req.valid("json");
  const db = getDb(c.env.DB);

  const existing = await getUserByEmail(db, email);
  if (existing) return c.json({ error: "An account with that email already exists" }, 409);

  const user = await createUser(db, {
    email,
    passwordHash: await hashPassword(password),
    displayName,
  });
  const token = newSessionId();
  await createSession(db, user!.id, token, sessionExpiry());
  setSessionCookie(c, token);

  return c.json({ user: toPublicUser(user!) }, 201);
});

authRoutes.post("/login", zValidator("json", loginInputSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = getDb(c.env.DB);

  const user = await getUserByEmail(db, email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: "Email or password is incorrect" }, 401);
  }

  const token = newSessionId();
  await createSession(db, user.id, token, sessionExpiry());
  setSessionCookie(c, token);
  return c.json({ user: toPublicUser(user) });
});

authRoutes.post("/logout", async (c) => {
  const token = c.req.header("cookie")?.match(/gt_session=([^;]+)/)?.[1];
  if (token) await deleteSession(getDb(c.env.DB), token);
  clearSessionCookie(c);
  return c.json({ ok: true });
});
