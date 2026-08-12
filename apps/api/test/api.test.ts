import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nextOccurrenceAfter, toDateStr } from "@getitdone/shared";
import { createApp } from "../src/app";

let mf: Miniflare;
let app: ReturnType<typeof createApp>;
let env: { DB: D1Database; APP_ENV: string };

async function request(
  path: string,
  opts: { method?: string; body?: unknown; cookie?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    "X-Requested-With": "getitdone",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.cookie) headers.Cookie = opts.cookie;
  return app.request(
    path,
    {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    },
    env,
  );
}

async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

function cookieOf(res: Response): string {
  const setCookie = res.headers.get("set-cookie");
  expect(setCookie).toBeTruthy();
  return setCookie!.split(";")[0]!;
}

const EMAIL = "test@example.com";
const PASSWORD = "hunter2hunter2";
let sessionCookie = "";

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } };",
    d1Databases: { DB: ":memory:" },
  });
  const d1 = await mf.getD1Database("DB");
  await migrate(drizzle(d1), { migrationsFolder: "migrations" });
  env = { DB: d1, APP_ENV: "development" };
  app = createApp(env);
});

afterAll(async () => {
  await mf?.dispose();
});

describe("auth", () => {
  it("signs up, returns a session cookie", async () => {
    const res = await request("/api/auth/signup", {
      body: { email: EMAIL, password: PASSWORD, displayName: "Testy" },
    });
    const { status, body } = await json(res);
    expect(status).toBe(201);
    expect(body.user?.email).toBe(EMAIL);
    sessionCookie = cookieOf(res);
  });

  it("rejects duplicate signup", async () => {
    const { status } = await json(
      await request("/api/auth/signup", { body: { email: EMAIL, password: PASSWORD } }),
    );
    expect(status).toBe(409);
  });

  it("returns the current user with a valid cookie", async () => {
    const { status, body } = await json(await request("/api/auth/me", { cookie: sessionCookie }));
    expect(status).toBe(200);
    expect(body.user?.email).toBe(EMAIL);
  });

  it("returns 401 without a cookie", async () => {
    const { status } = await json(await request("/api/auth/me"));
    expect(status).toBe(401);
  });

  it("logs in with correct password", async () => {
    const res = await request("/api/auth/login", { body: { email: EMAIL, password: PASSWORD } });
    const { status, body } = await json(res);
    expect(status).toBe(200);
    expect(body.user?.email).toBe(EMAIL);
    sessionCookie = cookieOf(res);
  });

  it("rejects a wrong password", async () => {
    const { status } = await json(
      await request("/api/auth/login", { body: { email: EMAIL, password: "nope-nope-nope" } }),
    );
    expect(status).toBe(401);
  });
});

describe("lists + tags", () => {
  let listId: string;
  let _tagId: string;

  it("creates a list", async () => {
    const { status, body } = await json(
      await request("/api/lists", {
        method: "POST",
        body: { name: "Errands", color: "#E2502E" },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(201);
    expect(body.list?.name).toBe("Errands");
    listId = body.list?.id;
  });

  it("renames a list", async () => {
    const { status, body } = await json(
      await request(`/api/lists/${listId}`, {
        method: "PATCH",
        body: { name: "Chores", icon: "🛠️" },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(200);
    expect(body.list?.name).toBe("Chores");
  });

  it("creates a tag", async () => {
    const { status, body } = await json(
      await request("/api/tags", {
        method: "POST",
        body: { name: "work", color: "#5B6EE8" },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(201);
    _tagId = body.tag?.id;
  });

  it("rejects unauthorized mutations", async () => {
    const { status } = await json(
      await request("/api/lists", { method: "POST", body: { name: "Nope" } }),
    );
    expect(status).toBe(401);
  });

  it("rejects requests without the CSRF header", async () => {
    const res = await app.request(
      "/api/tags",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ name: "x" }),
      },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("returns lists and tags in bootstrap", async () => {
    const { status, body } = await json(await request("/api/bootstrap", { cookie: sessionCookie }));
    expect(status).toBe(200);
    expect(body.lists.length).toBeGreaterThan(0);
    expect(body.tags.length).toBeGreaterThan(0);
    expect(body.counts).toHaveProperty("today");
  });

  it("reports open/completed counts per list", async () => {
    const created = await json(
      await request("/api/lists", { method: "POST", body: { name: "Count Me" }, cookie: sessionCookie }),
    );
    const listId = created.body.list?.id;
    const t1 = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "open task", listId },
        cookie: sessionCookie,
      }),
    );
    const t2 = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "done task", listId },
        cookie: sessionCookie,
      }),
    );
    await request(`/api/tasks/${t2.body.task?.id}/complete`, {
      method: "POST",
      body: { completed: true },
      cookie: sessionCookie,
    });
    const { body } = await json(await request("/api/bootstrap", { cookie: sessionCookie }));
    expect(body.listCounts[listId]).toEqual({ open: 1, completed: 1 });
    expect(body.listCounts[t1.body.task?.id]).toBeUndefined();
  });
});

describe("nested lists", () => {
  let parentId: string;
  let childId: string;

  it("creates a sub-list under a parent", async () => {
    const parent = await json(
      await request("/api/lists", { method: "POST", body: { name: "Project" }, cookie: sessionCookie }),
    );
    expect(parent.status).toBe(201);
    parentId = parent.body.list?.id;
    const child = await json(
      await request("/api/lists", {
        method: "POST",
        body: { name: "Sub-project", parentId },
        cookie: sessionCookie,
      }),
    );
    expect(child.status).toBe(201);
    expect(child.body.list?.parentId).toBe(parentId);
    childId = child.body.list?.id;
  });

  it("rejects a parent list that is not owned", async () => {
    const { status } = await json(
      await request("/api/lists", {
        method: "POST",
        body: { name: "Sneaky", parentId: "does-not-exist" },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(400);
  });

  it("rejects nesting a list under itself", async () => {
    const { status } = await json(
      await request(`/api/lists/${parentId}`, {
        method: "PATCH",
        body: { parentId },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(400);
  });

  it("rejects nesting a list under its own descendant", async () => {
    const { status } = await json(
      await request(`/api/lists/${parentId}`, {
        method: "PATCH",
        body: { parentId: childId },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(400);
  });

  it("flattens a list back to the root", async () => {
    const { status, body } = await json(
      await request(`/api/lists/${childId}`, {
        method: "PATCH",
        body: { parentId: null },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(200);
    expect(body.list?.parentId).toBeNull();
  });

  it("shows sub-list tasks in the parent list view", async () => {
    const sub = await json(
      await request("/api/lists", {
        method: "POST",
        body: { name: "Sub-project", parentId },
        cookie: sessionCookie,
      }),
    );
    expect(sub.status).toBe(201);
    const created = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "nested task", listId: sub.body.list?.id },
        cookie: sessionCookie,
      }),
    );
    expect(created.status).toBe(201);
    const parentView = await json(
      await request(`/api/tasks?listId=${parentId}`, { cookie: sessionCookie }),
    );
    expect(parentView.status).toBe(200);
    expect(parentView.body.tasks.some((t: { id: string }) => t.id === created.body.task?.id)).toBe(true);
  });
});

describe("tasks", () => {
  let taskId: string;
  let taskId2: string;

  it("creates a task with a tag and subtasks", async () => {
    const tags = (await json(await request("/api/tags", { cookie: sessionCookie }))).body.tags;
    const { status, body } = await json(
      await request("/api/tasks", {
        method: "POST",
        body: {
          title: "Buy milk",
          dueDate: toDateStr(new Date()),
          dueTime: "17:00",
          priority: 2,
          tagIds: [tags[0]?.id],
          subtasks: ["Find keys", "Walk to store"],
        },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(201);
    expect(body.task?.subtasks?.length).toBe(2);
    expect(body.task?.tags?.length).toBe(1);
    taskId = body.task?.id;
  });

  it("creates an un-dated task for the inbox", async () => {
    const { status, body } = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "Random thought" },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(201);
    taskId2 = body.task?.id;
  });

  it("finds today's tasks in the Today view", async () => {
    const { body } = await json(await request("/api/tasks?view=today", { cookie: sessionCookie }));
    const ids = (body.tasks as Array<{ id: string }>).map((t) => t.id);
    expect(ids).toContain(taskId);
  });

  it("finds inbox tasks", async () => {
    const { body } = await json(await request("/api/tasks?view=inbox", { cookie: sessionCookie }));
    const ids = (body.tasks as Array<{ id: string }>).map((t) => t.id);
    expect(ids).toContain(taskId2);
  });

  it("searches by keyword", async () => {
    const { body } = await json(await request("/api/tasks?q=milk", { cookie: sessionCookie }));
    const ids = (body.tasks as Array<{ id: string }>).map((t) => t.id);
    expect(ids).toContain(taskId);
  });

  it("marks a task complete and hides it from Today", async () => {
    const { status } = await json(
      await request(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        body: { completed: true },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(200);
    const { body } = await json(await request("/api/tasks?view=today", { cookie: sessionCookie }));
    const ids = (body.tasks as Array<{ id: string }>).map((t) => t.id);
    expect(ids).not.toContain(taskId);
  });

  it("saves the completion date on the task", async () => {
    const done = await json(
      await request(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        body: { completed: true },
        cookie: sessionCookie,
      }),
    );
    expect(done.status).toBe(200);
    expect(done.body.task?.completedAt).toBeTruthy();
    expect(Number.isNaN(Date.parse(done.body.task.completedAt))).toBe(false);
    const reopened = await json(
      await request(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        body: { completed: false },
        cookie: sessionCookie,
      }),
    );
    expect(reopened.body.task?.completedAt).toBeNull();
  });

  it("reopens a completed task", async () => {
    const { status } = await json(
      await request(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        body: { completed: false },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(200);
  });

  it("filters completed tasks out of a list view unless included", async () => {
    const list = await json(
      await request("/api/lists", { method: "POST", body: { name: "Filter Me" }, cookie: sessionCookie }),
    );
    const listId = list.body.list?.id;
    const t = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "filtered done", listId },
        cookie: sessionCookie,
      }),
    );
    const taskId3 = t.body.task?.id;
    await request(`/api/tasks/${taskId3}/complete`, {
      method: "POST",
      body: { completed: true },
      cookie: sessionCookie,
    });
    const hidden = await json(await request(`/api/tasks?listId=${listId}`, { cookie: sessionCookie }));
    expect(hidden.body.tasks.some((x: { id: string }) => x.id === taskId3)).toBe(false);
    const shown = await json(
      await request(`/api/tasks?listId=${listId}&includeCompleted=true`, { cookie: sessionCookie }),
    );
    expect(shown.body.tasks.some((x: { id: string }) => x.id === taskId3)).toBe(true);
  });

  it("edits and deletes a task", async () => {
    const { body } = await json(
      await request(`/api/tasks/${taskId2}`, {
        method: "PATCH",
        body: { title: "Renamed" },
        cookie: sessionCookie,
      }),
    );
    expect(body.task?.title).toBe("Renamed");
    const del = await json(
      await request(`/api/tasks/${taskId2}`, { method: "DELETE", cookie: sessionCookie }),
    );
    expect(del.status).toBe(200);
  });
});

describe("recurrence", () => {
  it("spawns the next weekly instance on completion", async () => {
    const tags = (await json(await request("/api/tags", { cookie: sessionCookie }))).body.tags;
    const { body } = await json(
      await request("/api/tasks", {
        method: "POST",
        body: {
          title: "Weekly standup",
          dueDate: toDateStr(new Date()),
          recurrence: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
          tagIds: [tags[0]?.id],
        },
        cookie: sessionCookie,
      }),
    );
    const id = body.task?.id;
    const res = await json(
      await request(`/api/tasks/${id}/complete`, {
        method: "POST",
        body: { completed: true },
        cookie: sessionCookie,
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body.next?.dueDate).toBe(
      nextOccurrenceAfter("FREQ=WEEKLY;BYDAY=MO,WE,FR", toDateStr(new Date())),
    );
    expect(res.body.next?.title).toBe("Weekly standup");
    expect(res.body.next?.tags?.length).toBe(1);
  });
});

describe("health", () => {
  it("reports ok", async () => {
    const res = await request("/api/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });
});

describe("reports", () => {
  it("summarizes totals and per-list status", async () => {
    const list = await json(
      await request("/api/lists", { method: "POST", body: { name: "Report List" }, cookie: sessionCookie }),
    );
    const listId = list.body.list?.id;
    await request("/api/tasks", {
      method: "POST",
      body: { title: "open", listId },
      cookie: sessionCookie,
    });
    const done = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "done", listId },
        cookie: sessionCookie,
      }),
    );
    await request(`/api/tasks/${done.body.task?.id}/complete`, {
      method: "POST",
      body: { completed: true },
      cookie: sessionCookie,
    });

    const res = await json(await request("/api/reports", { cookie: sessionCookie }));
    expect(res.status).toBe(200);
    expect(res.body.totals).toMatchObject({ open: expect.any(Number), completed: expect.any(Number) });
    expect(res.body.totals.total).toBe(res.body.totals.open + res.body.totals.completed);
    const row = res.body.byList.find((r: { list: { id: string } }) => r.list.id === listId);
    expect(row).toEqual({ list: expect.any(Object), open: 1, completed: 1, total: 2 });
  });

  it("rejects reports without a session", async () => {
    const res = await json(await request("/api/reports"));
    expect(res.status).toBe(401);
  });
});

describe("session", () => {
  it("logs out and invalidates the session", async () => {
    const { status } = await json(
      await request("/api/auth/logout", { method: "POST", cookie: sessionCookie }),
    );
    expect(status).toBe(200);
    const me = await json(await request("/api/auth/me", { cookie: sessionCookie }));
    expect(me.status).toBe(401);
  });
});
