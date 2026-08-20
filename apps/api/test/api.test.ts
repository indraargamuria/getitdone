import { drizzle } from "drizzle-orm/d1";
import { migrate } from "drizzle-orm/d1/migrator";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDaysStr, nextOccurrenceAfter, toDateStr } from "@getitdone/shared";
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
    expect(body.listCounts[listId]).toEqual({ open: 1, completed: 1, urgent: false });
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

  it("saves and updates an assignee", async () => {
    const created = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "Assignable", assignee: "Rina" },
        cookie: sessionCookie,
      }),
    );
    expect(created.status).toBe(201);
    expect(created.body.task?.assignee).toBe("Rina");
    const updated = await json(
      await request(`/api/tasks/${created.body.task?.id}`, {
        method: "PATCH",
        body: { assignee: "Budi" },
        cookie: sessionCookie,
      }),
    );
    expect(updated.body.task?.assignee).toBe("Budi");
    const cleared = await json(
      await request(`/api/tasks/${created.body.task?.id}`, {
        method: "PATCH",
        body: { assignee: null },
        cookie: sessionCookie,
      }),
    );
    expect(cleared.body.task?.assignee).toBeNull();
  });

  it("lists known assignees for suggestions", async () => {
    await request("/api/tasks", {
      method: "POST",
      body: { title: "Another", assignee: "Rina" },
      cookie: sessionCookie,
    });
    const { body } = await json(await request("/api/bootstrap", { cookie: sessionCookie }));
    expect(Array.isArray(body.assignees)).toBe(true);
    expect(body.assignees).toContain("Rina");
  });

  it("flags a list urgent when an open task is due today", async () => {
    const list = await json(
      await request("/api/lists", { method: "POST", body: { name: "Urgent List" }, cookie: sessionCookie }),
    );
    const listId = list.body.list?.id;
    await request("/api/tasks", {
      method: "POST",
      body: { title: "due today", listId, dueDate: toDateStr(new Date()) },
      cookie: sessionCookie,
    });
    await request("/api/tasks", {
      method: "POST",
      body: { title: "due later", listId, dueDate: addDaysStr(toDateStr(new Date()), 5) },
      cookie: sessionCookie,
    });
    const boot = (await json(await request("/api/bootstrap", { cookie: sessionCookie }))).body;
    expect(boot.listCounts[listId].urgent).toBe(true);

    await request("/api/tasks", {
      method: "POST",
      body: { title: "no due date", listId },
      cookie: sessionCookie,
    });
    const calm = await json(
      await request("/api/lists", { method: "POST", body: { name: "Calm List" }, cookie: sessionCookie }),
    );
    await request("/api/tasks", {
      method: "POST",
      body: { title: "tomorrow", listId: calm.body.list?.id, dueDate: addDaysStr(toDateStr(new Date()), 1) },
      cookie: sessionCookie,
    });
    const boot2 = (await json(await request("/api/bootstrap", { cookie: sessionCookie }))).body;
    expect(boot2.listCounts[calm.body.list?.id].urgent).toBe(false);
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

describe("subtask-aware completion", () => {
  it("creates a long symbolic title", async () => {
    const title = "🚀 30% off & \"urgent\" deals — #errands @home".repeat(30).slice(0, 499);
    const { status, body } = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(201);
    expect(body.task?.title).toBe(title);
  });

  it("rejects a title longer than 500 characters", async () => {
    const { status } = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "a".repeat(501) },
        cookie: sessionCookie,
      }),
    );
    expect(status).toBe(400);
  });

  it("counts a parent task by its subtasks", async () => {
    const list = await json(
      await request("/api/lists", { method: "POST", body: { name: "Sub Aware" }, cookie: sessionCookie }),
    );
    const listId = list.body.list?.id;
    const created = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "Ship feature", listId, subtasks: ["Build", "Test"] },
        cookie: sessionCookie,
      }),
    );
    expect(created.status).toBe(201);
    const taskId = created.body.task?.id;
    const [sub1, sub2] = created.body.task?.subtasks ?? [];

    let boot = (await json(await request("/api/bootstrap", { cookie: sessionCookie }))).body;
    expect(boot.listCounts[listId]).toEqual({ open: 2, completed: 0, urgent: false });

    await request(`/api/tasks/subtasks/${sub1?.id}/complete`, {
      method: "POST",
      body: { completed: true },
      cookie: sessionCookie,
    });
    boot = (await json(await request("/api/bootstrap", { cookie: sessionCookie }))).body;
    expect(boot.listCounts[listId]).toEqual({ open: 1, completed: 1, urgent: false });

    await request(`/api/tasks/subtasks/${sub2?.id}/complete`, {
      method: "POST",
      body: { completed: true },
      cookie: sessionCookie,
    });
    boot = (await json(await request("/api/bootstrap", { cookie: sessionCookie }))).body;
    expect(boot.listCounts[listId]).toEqual({ open: 0, completed: 2, urgent: false });
    expect(taskId).toBeTruthy();
  });

  it("completing a parent completes its subtasks and vice versa", async () => {
    const created = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "Parent toggle", subtasks: ["a", "b"] },
        cookie: sessionCookie,
      }),
    );
    const taskId = created.body.task?.id;

    const done = await json(
      await request(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        body: { completed: true },
        cookie: sessionCookie,
      }),
    );
    expect(done.status).toBe(200);
    expect(
      done.body.task?.subtasks?.every((s: { completedAt: string | null }) => s.completedAt),
    ).toBe(true);

    const reopen = await json(
      await request(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        body: { completed: false },
        cookie: sessionCookie,
      }),
    );
    expect(
      reopen.body.task?.subtasks?.every((s: { completedAt: string | null }) => !s.completedAt),
    ).toBe(true);
  });

  it("renames a subtask and preserves its completion state", async () => {
    const created = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "Rename me", subtasks: ["first draft"] },
        cookie: sessionCookie,
      }),
    );
    const subId = created.body.task?.subtasks?.[0]?.id;
    expect(subId).toBeTruthy();

    await request(`/api/tasks/subtasks/${subId}/complete`, {
      method: "POST",
      body: { completed: true },
      cookie: sessionCookie,
    });

    const renamed = await json(
      await request(`/api/tasks/subtasks/${subId}`, {
        method: "PATCH",
        body: { title: "  final pass  " },
        cookie: sessionCookie,
      }),
    );
    expect(renamed.status).toBe(200);
    expect(renamed.body.subtask?.title).toBe("final pass");
    expect(renamed.body.subtask?.completedAt).toBeTruthy();

    const task = await json(
      await request(`/api/tasks/${created.body.task?.id}`, { cookie: sessionCookie }),
    );
    expect(task.body.task?.subtasks?.[0]?.title).toBe("final pass");
    expect(task.body.task?.subtasks?.[0]?.completedAt).toBeTruthy();
  });

  it("rejects invalid subtask renames and unknown subtasks", async () => {
    const created = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "Edge cases", subtasks: ["keep me"] },
        cookie: sessionCookie,
      }),
    );
    const subId = created.body.task?.subtasks?.[0]?.id;

    const tooLong = await json(
      await request(`/api/tasks/subtasks/${subId}`, {
        method: "PATCH",
        body: { title: "b".repeat(201) },
        cookie: sessionCookie,
      }),
    );
    expect(tooLong.status).toBe(400);

    const empty = await json(
      await request(`/api/tasks/subtasks/${subId}`, {
        method: "PATCH",
        body: { title: "   " },
        cookie: sessionCookie,
      }),
    );
    expect(empty.status).toBe(400);

    const missing = await json(
      await request(`/api/tasks/subtasks/${subId}`, {
        method: "PATCH",
        body: {},
        cookie: sessionCookie,
      }),
    );
    expect(missing.status).toBe(400);

    const notFound = await json(
      await request("/api/tasks/subtasks/does-not-exist", {
        method: "PATCH",
        body: { title: "nope" },
        cookie: sessionCookie,
      }),
    );
    expect(notFound.status).toBe(404);

    const unauthorized = await json(
      await request(`/api/tasks/subtasks/${subId}`, {
        method: "PATCH",
        body: { title: "nope" },
      }),
    );
    expect(unauthorized.status).toBe(401);

    const intact = await json(
      await request(`/api/tasks/${created.body.task?.id}`, { cookie: sessionCookie }),
    );
    expect(intact.body.task?.subtasks?.[0]?.title).toBe("keep me");
  });

  it("rolls sub-list tasks into the parent list report summary", async () => {
    const parent = await json(
      await request("/api/lists", { method: "POST", body: { name: "Report Parent" }, cookie: sessionCookie }),
    );
    const parentId = parent.body.list?.id;
    const child = await json(
      await request("/api/lists", {
        method: "POST",
        body: { name: "Report Child", parentId },
        cookie: sessionCookie,
      }),
    );
    const childId = child.body.list?.id;
    await request("/api/tasks", {
      method: "POST",
      body: { title: "child open", listId: childId },
      cookie: sessionCookie,
    });
    const done = await json(
      await request("/api/tasks", {
        method: "POST",
        body: { title: "child done", listId: childId },
        cookie: sessionCookie,
      }),
    );
    await request(`/api/tasks/${done.body.task?.id}/complete`, {
      method: "POST",
      body: { completed: true },
      cookie: sessionCookie,
    });

    const res = await json(await request("/api/reports", { cookie: sessionCookie }));
    const parentRow = res.body.byList.find((r: { list: { id: string } }) => r.list.id === parentId);
    expect(parentRow).toEqual({ list: expect.any(Object), open: 1, completed: 1, total: 2 });
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
