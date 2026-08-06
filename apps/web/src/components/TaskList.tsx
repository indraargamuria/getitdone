import { useRef, useState } from "react";
import type { TaskWithRelations } from "../lib/api";
import { TaskItem } from "./TaskItem";

export function TaskList({
  tasks,
  activeId,
  onSelect,
  onToggleComplete,
  onReorder,
  sortable = true,
}: {
  tasks: TaskWithRelations[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  sortable?: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; pos: "above" | "below" } | null>(null);
  const dragging = useRef(false);

  const open = tasks.filter((t) => !t.completedAt);
  const done = tasks.filter((t) => t.completedAt);
  const canReorder = sortable && open.length > 1;

  function resetDrag() {
    setDragId(null);
    setOver(null);
    dragging.current = false;
  }

  function handleDrop() {
    if (!dragId || !over || !canReorder) {
      resetDrag();
      return;
    }
    const ids = open.map((t) => t.id);
    const from = ids.indexOf(dragId);
    if (from < 0) {
      resetDrag();
      return;
    }
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    if (moved === undefined) {
      resetDrag();
      return;
    }
    let target = next.indexOf(over.id);
    if (target < 0) {
      resetDrag();
      return;
    }
    if (over.pos === "below") target += 1;
    next.splice(target, 0, moved);
    resetDrag();
    onReorder(next);
  }

  function makeDragProps(taskId: string) {
    if (!canReorder) return undefined;
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        dragging.current = true;
        setDragId(taskId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", taskId);
      },
      onDragOver: (e: React.DragEvent) => {
        if (!dragId || taskId === dragId) return;
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const pos: "above" | "below" = e.clientY < rect.top + rect.height / 2 ? "above" : "below";
        setOver((prev) => (prev?.id === taskId && prev.pos === pos ? prev : { id: taskId, pos }));
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        handleDrop();
      },
      onDragEnd: resetDrag,
      isOver: over?.id === taskId,
      isDragging: dragId === taskId,
    } as const;
  }

  return (
    <div className="flex flex-col">
      <ul className="stagger flex flex-col gap-0.5">
        {open.map((task) => (
          <li key={task.id}>
            <TaskItem
              task={task}
              active={activeId === task.id}
              onSelect={() => onSelect(task.id)}
              onToggleComplete={() => onToggleComplete(task.id)}
              dragProps={makeDragProps(task.id)}
            />
          </li>
        ))}
      </ul>

      {done.length > 0 ? (
        <div className="mt-4">
          <div className="flex items-center gap-3 px-3">
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-inkfaint">
              Completed · {done.length}
            </h3>
            <span className="h-px flex-1 bg-rule" />
          </div>
          <ul className="mt-1 flex flex-col gap-0.5 opacity-80">
            {done.map((task) => (
              <li key={task.id}>
                <TaskItem
                  task={task}
                  active={activeId === task.id}
                  onSelect={() => onSelect(task.id)}
                  onToggleComplete={() => onToggleComplete(task.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
