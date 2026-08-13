import {
  addDaysStr,
  humanDueLabel,
  humanTime,
  startOfToday,
  TASK_TITLE_MAX,
} from "@getitdone/shared";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ApiError, tasksApi } from "../lib/api";
import { cn } from "../lib/cn";
import { invalidateAll } from "../lib/mutations";
import { AssigneeField, Popover } from "./fields";
import { CalendarIcon, PlusIcon, UserIcon, XIcon } from "./icons";
import { useToast } from "./ui";

const inputCls =
  "w-full cursor-pointer rounded-lg border border-rule bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent";

function friendlyCreateError(e: unknown): string {
  if (e instanceof ApiError && Array.isArray(e.issues)) {
    const issue = e.issues.find((i) => (i as { path?: unknown[] }).path?.[0] === "title") as
      | { code?: string; message?: string }
      | undefined;
    if (issue) {
      if (issue.code === "too_big") return "Title is too long — max 500 characters.";
      if (issue.code === "too_small") return "Title can't be empty.";
      if (issue.message) return issue.message;
    }
  }
  return e instanceof Error ? e.message : "Unknown error";
}

export function QuickAdd({
  listId,
  tagIds,
  autoFocus,
  placeholder,
  className,
  assignees,
}: {
  listId?: string | null;
  tagIds?: string[];
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  assignees?: string[];
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [assignee, setAssignee] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const today = startOfToday();

  const create = useMutation({
    mutationFn: (body: {
      title: string;
      date: string | null;
      time: string | null;
      assignee: string | null;
    }) =>
      tasksApi.create({
        title: body.title,
        dueDate: body.date,
        dueTime: body.time,
        assignee: body.assignee,
        listId: listId ?? undefined,
        tagIds,
      }),
    onSuccess: () => {
      setTitle("");
      setDate(null);
      setTime(null);
      setAssignee(null);
      invalidateAll();
      inputRef.current?.focus();
    },
    onError: (e) => toast("error", "Couldn't add task", friendlyCreateError(e)),
  });

  const dateLabel = date
    ? `${date === today ? "Today" : date === addDaysStr(today, 1) ? "Tmrw" : humanDueLabel(date)}${time ? ` · ${humanTime(time)}` : ""}`
    : "";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-rule bg-card px-3 py-2.5 shadow-sm transition-colors focus-within:border-accent focus-within:bg-card3",
        className,
      )}
    >
      <PlusIcon className="size-4 shrink-0 text-accent" strokeWidth={2.4} />
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={TASK_TITLE_MAX}
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            create.mutate({ title: title.trim(), date, time, assignee });
          }
        }}
        placeholder={placeholder ?? "Add a task and press Enter…"}
        aria-label="Add a task"
        className="w-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-inkfaint"
      />
      <div className="flex items-center gap-1">
        {date ? (
          <button
            type="button"
            onClick={() => {
              setDate(null);
              setTime(null);
            }}
            title="Clear due date"
            className="flex items-center gap-1 rounded-lg bg-accentsoft px-2 py-1 text-xs font-medium text-accentstrong dark:text-accent"
          >
            {dateLabel}
            <XIcon className="size-3" />
          </button>
        ) : null}
        {assignee ? (
          <button
            type="button"
            onClick={() => setAssignee(null)}
            title="Clear assignee"
            className="flex items-center gap-1 rounded-lg bg-card2 px-2 py-1 text-xs font-medium text-inkdim"
          >
            <UserIcon className="size-3" />
            {assignee}
            <XIcon className="size-3" />
          </button>
        ) : null}
        <Popover
          trigger={(open) => (
            <button
              type="button"
              aria-label="Assign someone"
              title="Assign someone"
              className={cn(
                "grid size-8 cursor-pointer place-items-center rounded-lg text-inkdim transition-colors hover:bg-card2 hover:text-ink",
                open && "bg-card2 text-ink",
                assignee && "text-accent",
              )}
            >
              <UserIcon className="size-4" />
            </button>
          )}
          width="w-56"
          z="z-50"
        >
          <AssigneeField
            value={assignee}
            suggestions={assignees ?? []}
            onChange={(v) => setAssignee(v)}
          />
        </Popover>
        <Popover
          trigger={(open) => (
            <button
              type="button"
              aria-label="Add due date"
              title="Add due date"
              className={cn(
                "grid size-8 cursor-pointer place-items-center rounded-lg text-inkdim transition-colors hover:bg-card2 hover:text-ink",
                open && "bg-card2 text-ink",
              )}
            >
              <CalendarIcon className="size-4" />
            </button>
          )}
          z="z-50"
          onOpenChange={(o) => {
            if (o && !date) setDate(today);
          }}
        >
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Today", d: today },
                { label: "Tomorrow", d: addDaysStr(today, 1) },
                { label: "+7 days", d: addDaysStr(today, 7) },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setDate(preset.d)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                    date === preset.d
                      ? "border-accent bg-accentsoft text-accentstrong dark:text-accent"
                      : "border-rule bg-card text-inkdim hover:text-ink",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={date ?? ""}
                onChange={(e) => setDate(e.target.value || null)}
                className={inputCls}
                aria-label="Due date"
              />
              <input
                type="time"
                value={time ?? ""}
                disabled={!date}
                onChange={(e) => setTime(e.target.value || null)}
                className={cn(inputCls, "disabled:opacity-40")}
                aria-label="Due time"
              />
            </div>
          </div>
        </Popover>
      </div>
    </div>
  );
}
