import type {
  List,
  ListInput,
  ReportSummary,
  Subtask,
  Tag,
  TagInput,
  Task,
  TaskCreateInput,
  TaskInput,
} from "@getitdone/shared";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues?: unknown[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "getitdone",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let issues: unknown[] | undefined;
    try {
      const body = (await res.json()) as { error?: string; issues?: unknown[] };
      if (body?.error) message = body.error;
      issues = body?.issues;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message, issues);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type TaskWithRelations = Task & { tags: Tag[]; subtasks: Subtask[] };

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string | null;
  createdAt?: string;
}

export interface Bootstrap {
  user: UserProfile;
  lists: List[];
  tags: Tag[];
  counts: { today: number; week: number; inbox: number; all: number; completed: number };
  listCounts: Record<string, { open: number; completed: number }>;
}

export interface TaskListResponse {
  tasks: TaskWithRelations[];
}

export type ViewFilter = "today" | "week" | "inbox" | "all" | "completed";

export interface TaskQuery {
  view?: ViewFilter;
  listId?: string;
  tagId?: string;
  q?: string;
  includeCompleted?: boolean;
}

function toQuery(q: TaskQuery): string {
  const params = new URLSearchParams();
  if (q.view) params.set("view", q.view);
  if (q.listId) params.set("listId", q.listId);
  if (q.tagId) params.set("tagId", q.tagId);
  if (q.q) params.set("q", q.q);
  if (typeof q.includeCompleted === "boolean")
    params.set("includeCompleted", String(q.includeCompleted));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const authApi = {
  me: () => api<{ user: UserProfile }>("/api/auth/me"),
  signup: (body: { email: string; password: string; displayName?: string }) =>
    api<{ user: UserProfile }>("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    api<{ user: UserProfile }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => api<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
};

export const bootstrapApi = () => api<Bootstrap>("/api/bootstrap");

export const reportsApi = {
  summary: () => api<ReportSummary>("/api/reports"),
};

export const listsApi = {
  list: () => api<{ lists: List[] }>("/api/lists"),
  create: (body: ListInput) =>
    api<{ list: List }>("/api/lists", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<ListInput>) =>
    api<{ list: List }>(`/api/lists/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => api<{ ok: boolean }>(`/api/lists/${id}`, { method: "DELETE" }),
  reorder: (orderedIds: string[]) =>
    api<{ ok: boolean }>("/api/lists/reorder", {
      method: "POST",
      body: JSON.stringify({ orderedIds }),
    }),
};

export const tagsApi = {
  list: () => api<{ tags: Tag[] }>("/api/tags"),
  create: (body: TagInput) =>
    api<{ tag: Tag }>("/api/tags", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<TagInput>) =>
    api<{ tag: Tag }>(`/api/tags/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => api<{ ok: boolean }>(`/api/tags/${id}`, { method: "DELETE" }),
};

export const tasksApi = {
  list: (query: TaskQuery) => api<TaskListResponse>(`/api/tasks${toQuery(query)}`),
  get: (id: string) => api<{ task: TaskWithRelations }>(`/api/tasks/${id}`),
  create: (body: TaskCreateInput) =>
    api<{ task: TaskWithRelations }>("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: TaskInput) =>
    api<{ task: TaskWithRelations }>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id: string) => api<{ ok: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }),
  complete: (id: string, completed: boolean) =>
    api<{ task: TaskWithRelations; next?: TaskWithRelations }>(`/api/tasks/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ completed }),
    }),
  reorder: (orderedIds: string[]) =>
    api<{ ok: boolean }>("/api/tasks/reorder", {
      method: "POST",
      body: JSON.stringify({ orderedIds }),
    }),
  addTag: (id: string, tagId: string) =>
    api<{ ok: boolean }>(`/api/tasks/${id}/tags`, {
      method: "POST",
      body: JSON.stringify({ tagId }),
    }),
  removeTag: (id: string, tagId: string) =>
    api<{ ok: boolean }>(`/api/tasks/${id}/tags/${tagId}`, { method: "DELETE" }),
  addSubtask: (id: string, title: string) =>
    api<{ subtask: Subtask }>(`/api/tasks/${id}/subtasks`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  updateSubtask: (id: string, title: string) =>
    api<{ subtask: Subtask }>(`/api/tasks/subtasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  deleteSubtask: (id: string) =>
    api<{ ok: boolean }>(`/api/tasks/subtasks/${id}`, { method: "DELETE" }),
  completeSubtask: (id: string, completed: boolean) =>
    api<{ subtask: Subtask }>(`/api/tasks/subtasks/${id}/${completed ? "complete" : "reopen"}`, {
      method: "POST",
    }),
};
