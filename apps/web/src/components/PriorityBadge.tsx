import { cn } from "../lib/cn";

const PRIORITY_MARKS: Record<number, string> = { 1: "!!!", 2: "!!", 3: "!" };

export function PriorityBadge({
  priority,
  size = "sm",
  className,
}: {
  priority: number;
  size?: "sm" | "md";
  className?: string;
}) {
  if (priority >= 4) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1 py-px font-bold leading-none tabnum",
        size === "sm" ? "text-[10px]" : "text-xs",
        className,
      )}
      style={{
        color: `var(--p${priority})`,
        borderColor: `color-mix(in srgb, var(--p${priority}) 40%, transparent)`,
      }}
      title={`Priority P${priority}`}
    >
      <span className="opacity-80">P{priority}</span>
      {PRIORITY_MARKS[priority] ?? ""}
    </span>
  );
}
