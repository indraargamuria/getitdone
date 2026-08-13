import {
  daysFromToday,
  humanDateLabel,
  humanDueLabel,
  humanTime,
  type Subtask,
  subtaskProgress,
} from "@getitdone/shared";
import { memo } from "react";
import type { TaskWithRelations } from "../lib/api";
import { cn } from "../lib/cn";
import { CheckIcon, GripIcon, RepeatIcon } from "./icons";
import { Checkbox } from "./ui";

function DueChip({ task }: { task: TaskWithRelations }) {
  if (!task.dueDate) return null;
  const overdue = !task.completedAt && daysFromToday(task.dueDate) < 0;
  const today = !task.completedAt && daysFromToday(task.dueDate) === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabnum",
        overdue && "bg-accent/12 text-accent",
        today && "bg-warn/14 text-warn",
        !overdue && !today && "text-inkdim",
        task.completedAt && "text-inkfaint line-through",
      )}
    >
      {humanDueLabel(task.dueDate)}
      {task.dueTime ? <span className="opacity-80">· {humanTime(task.dueTime)}</span> : null}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  if (priority >= 4) return null;
  const marks = 4 - priority; // P1 → !!!, P2 → !!, P3 → !
  return (
    <span
      className="mt-0.5 inline-flex shrink-0 items-center rounded-md border px-1 py-px text-[10px] font-bold leading-none tabnum"
      style={{
        color: `var(--p${priority})`,
        borderColor: `color-mix(in srgb, var(--p${priority}) 40%, transparent)`,
      }}
      title={`Priority P${priority}`}
    >
      {"!".repeat(marks)}
    </span>
  );
}

function SubtaskRow({ sub, onToggle }: { sub: Subtask; onToggle: () => void }) {
  const done = !!sub.completedAt;
  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-card2/60">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`Mark subtask "${sub.title}" ${done ? "not done" : "done"}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "grid size-4 shrink-0 cursor-pointer place-items-center rounded-[5px] border transition-colors",
          done ? "border-transparent" : "border-rulestrong bg-card hover:border-accent",
        )}
        style={done ? { background: "var(--ok)" } : undefined}
      >
        <svg viewBox="0 0 24 24" className="size-2.5 text-card3">
          <path
            d="m5 12.5 4.5 4.5L19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px] leading-snug text-inkdim transition-colors",
          done && "text-inkfaint line-through",
        )}
      >
        {sub.title}
      </span>
    </div>
  );
}

export const TaskItem = memo(function TaskItem({
  task,
  active,
  onSelect,
  onToggleComplete,
  onToggleSubtask,
  dragProps,
}: {
  task: TaskWithRelations;
  active: boolean;
  onSelect: () => void;
  onToggleComplete: () => void;
  onToggleSubtask?: (subtaskId: string, completed: boolean) => void;
  dragProps?: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    isOver: boolean;
    isDragging: boolean;
  };
}) {
  const { done: subDone, total: subTotal } = subtaskProgress(task.subtasks);
  const hasSubtasks = task.subtasks.length > 0;
  const done = hasSubtasks ? subDone === subTotal : !!task.completedAt;
  const priority = task.priority < 4 ? task.priority : null;

  return (
    <div
      draggable={dragProps?.draggable}
      onDragStart={dragProps?.onDragStart}
      onDragOver={dragProps?.onDragOver}
      onDrop={dragProps?.onDrop}
      onDragEnd={dragProps?.onDragEnd}
      onClick={onSelect}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 rounded-xl px-2 py-3 transition-colors sm:px-3",
        "hover:bg-card/80",
        active && "bg-accentsoft/60 hover:bg-accentsoft/80",
        dragProps?.isOver && "ring-2 ring-accent/50 ring-inset",
        dragProps?.isDragging && "opacity-40",
      )}
      title={task.title}
    >
      {dragProps?.isOver ? <DropLine /> : null}
      <Checkbox
        checked={done}
        onToggle={onToggleComplete}
        accent="var(--ok)"
        className="mt-0.5"
        label={`Mark "${task.title}" ${done ? "not done" : "done"}`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          {priority ? <PriorityBadge priority={task.priority} /> : null}
          <p
            className={cn(
              "break-words text-[15px] leading-snug text-ink transition-colors",
              done && "done-strike is-done text-inkfaint line-through",
            )}
          >
            {task.title}
          </p>
        </div>

        {hasSubtasks ? (
          <div className="mt-1.5 space-y-0.5">
            {task.subtasks.map((sub) => (
              <SubtaskRow
                key={sub.id}
                sub={sub}
                onToggle={() => onToggleSubtask?.(sub.id, !sub.completedAt)}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-0">
          <DueChip task={task} />
          {hasSubtasks && !task.completedAt ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md bg-card2 px-1.5 py-0.5 text-[11px] tabnum",
                subDone === subTotal ? "text-ok" : "text-inkdim",
              )}
            >
              <span className="h-1 w-8 overflow-hidden rounded-full bg-card3">
                <span
                  className={cn("block h-full rounded-full", subDone === subTotal && "bg-ok")}
                  style={{
                    width: `${Math.round((subDone / subTotal) * 100)}%`,
                    background: subDone === subTotal ? undefined : "var(--accent)",
                  }}
                />
              </span>
              {subDone}/{subTotal}
            </span>
          ) : null}
          {task.completedAt ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-ok/10 px-1.5 py-0.5 text-[11px] font-medium text-ok">
              <CheckIcon className="size-3" strokeWidth={2.4} />
              Done {humanDateLabel(task.completedAt)}
            </span>
          ) : null}
          {task.recurrence ? (
            <RepeatIcon className="size-3 text-inkfaint" aria-label="Repeats" />
          ) : null}
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full border border-rule px-1.5 py-0.5 text-[10.5px] font-medium text-inkdim"
            >
              <span className="size-1.5 rounded-full" style={{ background: tag.color }} />
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      <GripIcon className="mt-1 hidden size-4 shrink-0 text-inkfaint opacity-0 transition-opacity group-hover:opacity-60 md:block" />
    </div>
  );
});

function DropLine() {
  return (
    <span className="pointer-events-none absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent" />
  );
}
