import { effectiveTaskDone, formatMonthYear, startOfToday } from "@getitdone/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router";
import {
  CalendarIcon,
  CheckIcon,
  InboxIcon,
  LayersIcon,
  ListIcon,
  SearchIcon,
  SparkIcon,
  TagIcon,
} from "../components/icons";
import { QuickAdd } from "../components/QuickAdd";
import { TaskList } from "../components/TaskList";
import { EmptyState, Toggle, useToast } from "../components/ui";
import { bootstrapApi, type TaskQuery, type TaskWithRelations, tasksApi } from "../lib/api";
import { invalidateBootstrap, invalidateTasks } from "../lib/mutations";
import { useTaskContext } from "./AppShell";

interface ViewConfig {
  query: TaskQuery;
  eyebrow: string;
  title: string;
  sub: string;
  kind: "smart" | "list" | "tag" | "search";
  smart?: "today" | "week" | "inbox" | "all" | "completed";
}

function isEffectivelyOpen(task: TaskWithRelations): boolean {
  if (task.subtasks.length > 0) return !task.subtasks.every((s) => s.completedAt);
  return !task.completedAt;
}

function useViewConfig(): ViewConfig {
  const { pathname } = useLocation();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const q = sp.get("q") ?? "";

  return useMemo(() => {
    if (pathname === "/today")
      return {
        query: { view: "today" },
        eyebrow: "Focus",
        title: "Today",
        sub: formatMonthYear(),
        kind: "smart",
        smart: "today",
      };
    if (pathname === "/week")
      return {
        query: { view: "week" },
        eyebrow: "Coming up",
        title: "Next 7 Days",
        sub: `${formatMonthYear()} · the week ahead`,
        kind: "smart",
        smart: "week",
      };
    if (pathname === "/inbox")
      return {
        query: { view: "inbox" },
        eyebrow: "Capture",
        title: "Inbox",
        sub: "Unsorted thoughts, no list.",
        kind: "smart",
        smart: "inbox",
      };
    if (pathname === "/all")
      return {
        query: { view: "all" },
        eyebrow: "Overview",
        title: "All Tasks",
        sub: "Everything still open.",
        kind: "smart",
        smart: "all",
      };
    if (pathname === "/completed")
      return {
        query: { view: "completed" },
        eyebrow: "Archive",
        title: "Completed",
        sub: "A ledger of finished work.",
        kind: "smart",
        smart: "completed",
      };
    if (pathname.startsWith("/list/") && id)
      return { query: { listId: id }, eyebrow: "List", title: id, sub: "", kind: "list" };
    if (pathname.startsWith("/tag/") && id)
      return { query: { tagId: id }, eyebrow: "Tag", title: id, sub: "", kind: "tag" };
    if (pathname.startsWith("/search"))
      return {
        query: { q },
        eyebrow: "Search",
        title: q ? `“${q}”` : "Search",
        sub: q ? "Matching tasks, everywhere." : "Type to search across all tasks.",
        kind: "search",
      };
    return {
      query: { view: "all" },
      eyebrow: "",
      title: "All Tasks",
      sub: "",
      kind: "smart",
      smart: "all",
    };
  }, [pathname, id, q]);
}

type EmptyKey = "today" | "week" | "inbox" | "all" | "completed" | "list" | "tag" | "search";

const EMPTY = {
  today: {
    title: "A clear day.",
    hint: "Nothing is due today. Add a task or enjoy the margin.",
    icon: <SparkIcon className="size-6" />,
  },
  week: {
    title: "The week is open.",
    hint: "No tasks in the next seven days.",
    icon: <CalendarIcon className="size-6" />,
  },
  inbox: {
    title: "Inbox zero.",
    hint: "No loose thoughts. Type below to capture one.",
    icon: <InboxIcon className="size-6" />,
  },
  all: {
    title: "Nothing to do.",
    hint: "Every task is done. That never happens — add one.",
    icon: <LayersIcon className="size-6" />,
  },
  completed: {
    title: "Nothing finished yet.",
    hint: "Mark a task done and it will show up here.",
    icon: <CheckIcon className="size-6" />,
  },
  list: {
    title: "This list is empty.",
    hint: "Add your first task below.",
    icon: <ListIcon className="size-6" />,
  },
  tag: {
    title: "No tasks tagged yet.",
    hint: "Tag a task and it will land here.",
    icon: <TagIcon className="size-6" />,
  },
  search: {
    title: "No matches.",
    hint: "Try a different keyword.",
    icon: <SearchIcon className="size-6" />,
  },
} satisfies Record<EmptyKey, { title: string; hint: string; icon: React.ReactNode }>;

export default function ViewPage() {
  const cfg = useViewConfig();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const q = sp.get("q") ?? "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { openTask } = useTaskContext();

  const bootstrap = useQuery({ queryKey: ["bootstrap"], queryFn: bootstrapApi, retry: false });
  const [showCompleted, setShowCompleted] = useState(true);

  const query = useMemo(() => {
    const q = { ...cfg.query };
    if (cfg.kind === "list") q.includeCompleted = showCompleted;
    return q;
  }, [cfg.query, cfg.kind, showCompleted]);
  const tasksKey = useMemo(() => ["tasks", query] as const, [query]);

  const tasksQuery = useQuery({
    queryKey: tasksKey,
    queryFn: () => tasksApi.list(query),
    enabled: cfg.kind !== "search" || q.trim().length > 0,
  });

  const list = bootstrap.data?.lists.find((l) => l.id === id);
  const tag = bootstrap.data?.tags.find((t) => t.id === id);

  const resolvedTitle =
    cfg.kind === "list"
      ? (list?.name ?? "List")
      : cfg.kind === "tag"
        ? `#${tag?.name ?? "tag"}`
        : cfg.title;

  const completeMut = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      tasksApi.complete(taskId, completed),
    onMutate: async ({ taskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const prev = queryClient.getQueryData(tasksKey);
      queryClient.setQueryData(tasksKey, (old?: { tasks: TaskWithRelations[] }) => {
        if (!old) return old;
        const now = new Date().toISOString();
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  completedAt: completed ? now : null,
                  subtasks: completed
                    ? t.subtasks.map((s) => ({ ...s, completedAt: now }))
                    : t.subtasks.map((s) => ({ ...s, completedAt: null })),
                }
              : t,
          ),
        };
      });
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(tasksKey, ctx.prev);
      toast("error", "Couldn't update task", (e as Error).message);
    },
    onSuccess: (res) => {
      invalidateTasks();
      invalidateBootstrap();
      if (res.next?.dueDate) {
        toast("success", "Completed — next up scheduled");
      }
    },
  });

  const completeSubtaskMut = useMutation({
    mutationFn: ({ subtaskId, completed }: { subtaskId: string; completed: boolean }) =>
      tasksApi.completeSubtask(subtaskId, completed),
    onMutate: async ({ subtaskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const prev = queryClient.getQueryData(tasksKey);
      queryClient.setQueryData(tasksKey, (old?: { tasks: TaskWithRelations[] }) => {
        if (!old) return old;
        const now = new Date().toISOString();
        return {
          ...old,
          tasks: old.tasks.map((t) => ({
            ...t,
            subtasks: t.subtasks.map((s) =>
              s.id === subtaskId ? { ...s, completedAt: completed ? now : null } : s,
            ),
          })),
        };
      });
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(tasksKey, ctx.prev);
      toast("error", "Couldn't update subtask", (e as Error).message);
    },
    onSuccess: () => {
      invalidateTasks();
      invalidateBootstrap();
    },
  });

  function handleReorder(orderedIds: string[]) {
    const reorder = (old?: { tasks: TaskWithRelations[] }) => {
      if (!old) return old;
      const byId = new Map(old.tasks.map((t) => [t.id, t]));
      const open = orderedIds.map((id2) => byId.get(id2)).filter(Boolean) as TaskWithRelations[];
      const done = old.tasks.filter((t) => t.completedAt);
      return { ...old, tasks: [...open, ...done] };
    };
    queryClient.setQueryData(tasksKey, reorder);
    tasksApi.reorder(orderedIds).catch(() => {
      invalidateTasks();
      toast("error", "Couldn't reorder");
    });
  }

  const tasks = tasksQuery.data?.tasks ?? [];
  const loading = tasksQuery.isPending;
  const openUnits = (t: TaskWithRelations) =>
    t.subtasks.length > 0
      ? t.subtasks.filter((s) => !s.completedAt).length
      : isEffectivelyOpen(t)
        ? 1
        : 0;
  const count = cfg.kind === "search" ? tasks.length : tasks.reduce((n, t) => n + openUnits(t), 0);

  const listSummary =
    cfg.kind === "list" && id ? (bootstrap.data?.listCounts[id] ?? undefined) : undefined;
  const listPct = listSummary
    ? Math.round((listSummary.completed / (listSummary.open + listSummary.completed)) * 100)
    : 0;

  const quickAddListId = cfg.kind === "list" ? id : null;
  const quickAddTagIds = cfg.kind === "tag" ? [id!] : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-8 sm:pt-8">
      <header className="anim-fade-up mb-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-accent">
          {cfg.eyebrow}
        </p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-semibold italic tracking-tight text-ink sm:text-4xl">
            {resolvedTitle}
          </h1>
          {cfg.kind === "smart" && !loading ? (
            <p className="mb-1 hidden font-mono text-[11px] uppercase tracking-[0.18em] text-inkfaint tabnum sm:block">
              {count} open
            </p>
          ) : null}
          {cfg.kind === "list" && listSummary && listSummary.open + listSummary.completed > 0 ? (
            <div className="mb-1 shrink-0 text-right">
              <p className="font-mono text-[11px] tabnum text-inkfaint">
                {listSummary.open} open · {listPct}% done
              </p>
              <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-card2">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${listPct}%`,
                    background: listPct === 100 ? "var(--ok)" : "var(--accent)",
                  }}
                />
              </div>
            </div>
          ) : null}
          {cfg.kind === "list" ? (
            <div className="mb-1 shrink-0">
              <Toggle checked={showCompleted} onChange={setShowCompleted} label="Show completed" />
            </div>
          ) : null}
        </div>
        {cfg.sub ? <p className="mt-1 text-sm text-inkdim">{cfg.sub}</p> : null}
      </header>

      <div className="anim-fade-up" style={{ animationDelay: "0.06s" }}>
        <QuickAdd
          listId={quickAddListId}
          tagIds={quickAddTagIds}
          assignees={bootstrap.data?.assignees}
          placeholder={cfg.kind === "search" ? "Add a task…" : undefined}
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-2 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={EMPTY[(cfg.smart ?? cfg.kind) as EmptyKey].icon}
            title={EMPTY[(cfg.smart ?? cfg.kind) as EmptyKey].title}
            hint={EMPTY[(cfg.smart ?? cfg.kind) as EmptyKey].hint}
          />
        ) : (
          <TaskList
            tasks={tasks}
            onSelect={openTask}
            onToggleComplete={(taskId) => {
              const task = tasks.find((t) => t.id === taskId);
              completeMut.mutate({ taskId, completed: task ? !effectiveTaskDone(task) : true });
            }}
            onToggleSubtask={(subtaskId, completed) =>
              completeSubtaskMut.mutate({ subtaskId, completed })
            }
            onReorder={handleReorder}
            sortable={cfg.kind !== "search" && cfg.smart !== "completed"}
          />
        )}
      </div>

      <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-inkfaint/70">
        {startOfToday()} · get it done
      </p>
    </div>
  );
}
