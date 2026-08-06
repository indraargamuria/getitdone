import { daysFromToday, humanDueLabel } from "@getitdone/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { tasksApi } from "../lib/api";
import { cn } from "../lib/cn";
import { SearchIcon, XIcon } from "./icons";

export function SearchOverlay({
  open,
  onClose,
  onOpenTask,
}: {
  open: boolean;
  onClose: () => void;
  onOpenTask: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQ("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => tasksApi.list({ q }),
    enabled: open && q.trim().length > 0,
  });

  const results = data?.tasks ?? [];
  const showEmpty = q.trim().length > 0 && !isFetching && results.length === 0;

  return (
    <div className={cn("fixed inset-0 z-[60]", !open && "hidden")}>
      <div
        className="anim-fade-in absolute inset-0 bg-ink/40 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div className="anim-fade-up relative mx-auto mt-[12vh] w-[min(92vw,640px)] overflow-hidden rounded-2xl border border-rule bg-paper shadow-lift">
        <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
          <SearchIcon className="size-5 text-accent" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate(`/search?q=${encodeURIComponent(q.trim())}`);
                onClose();
              }
            }}
            placeholder="Search tasks, notes, lists…"
            className="w-full bg-transparent text-base outline-none placeholder:text-inkfaint"
          />
          <kbd className="rounded-md border border-rule bg-card px-1.5 py-0.5 font-mono text-[10px] text-inkfaint">
            esc
          </kbd>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="cursor-pointer rounded-md p-1 text-inkfaint hover:text-ink"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {isFetching ? (
            <p className="px-3 py-6 text-center font-mono text-xs text-inkfaint">Searching…</p>
          ) : showEmpty ? (
            <p className="px-3 py-6 text-center text-sm text-inkfaint">
              No results for <span className="font-medium text-ink">“{q}”</span>
            </p>
          ) : (
            results.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  onOpenTask(task.id);
                  onClose();
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-card"
              >
                <span
                  className={cn(
                    "size-4 shrink-0 rounded-[5px] border",
                    task.completedAt ? "border-ok bg-ok" : "border-rulestrong",
                  )}
                />
                <span
                  className={cn(
                    "flex-1 truncate text-sm",
                    task.completedAt && "text-inkfaint line-through",
                  )}
                >
                  {task.title}
                </span>
                {task.dueDate ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] tabnum",
                      !task.completedAt && daysFromToday(task.dueDate) < 0
                        ? "bg-accent/12 text-accent"
                        : "text-inkdim",
                    )}
                  >
                    {humanDueLabel(task.dueDate)}
                  </span>
                ) : null}
                {task.tags.length > 0 ? (
                  <span className="flex shrink-0">
                    {task.tags.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className="-ml-1 size-2.5 rounded-full ring-2 ring-paper"
                        style={{ background: t.color }}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
