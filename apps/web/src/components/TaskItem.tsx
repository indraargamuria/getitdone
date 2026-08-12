import { daysFromToday, humanDateLabel, humanDueLabel, humanTime } from "@getitdone/shared";
import { memo } from "react";
import type { TaskWithRelations } from "../lib/api";
import { cn } from "../lib/cn";
import { CheckIcon, FlagIcon, GripIcon, RepeatIcon } from "./icons";
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

export const TaskItem = memo(function TaskItem({
  task,
  active,
  onSelect,
  onToggleComplete,
  dragProps,
}: {
  task: TaskWithRelations;
  active: boolean;
  onSelect: () => void;
  onToggleComplete: () => void;
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
  const done = !!task.completedAt;
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
          {priority ? (
            <FlagIcon
              className="mt-0.5 size-3.5 shrink-0"
              strokeWidth={2.2}
              style={{ color: `var(--p${priority})` }}
            />
          ) : null}
          <p
            className={cn(
              "break-words text-[15px] leading-snug text-ink transition-colors",
              done && "done-strike is-done text-inkfaint line-through",
            )}
          >
            {task.title}
          </p>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-0">
          <DueChip task={task} />
          {task.completedAt ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-ok/10 px-1.5 py-0.5 text-[11px] font-medium text-ok">
              <CheckIcon className="size-3" strokeWidth={2.4} />
              Done {humanDateLabel(task.completedAt)}
            </span>
          ) : null}
          {task.recurrence ? (
            <RepeatIcon className="size-3 text-inkfaint" aria-label="Repeats" />
          ) : null}
          {task.subtasks.length > 0 ? (
            <span
              className={cn(
                "text-[11px] tabnum",
                task.subtasks.every((s) => s.completedAt) && !done ? "text-ok" : "text-inkfaint",
              )}
            >
              {task.subtasks.filter((s) => s.completedAt).length}/{task.subtasks.length}
            </span>
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
