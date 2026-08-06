import { addDaysStr, startOfToday } from "@getitdone/shared";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { tasksApi } from "../lib/api";
import { cn } from "../lib/cn";
import { invalidateAll } from "../lib/mutations";
import { CalendarIcon, PlusIcon, XIcon } from "./icons";
import { useToast } from "./ui";

export function QuickAdd({
  listId,
  tagIds,
  autoFocus,
  placeholder,
  className,
}: {
  listId?: string | null;
  tagIds?: string[];
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const today = startOfToday();

  const create = useMutation({
    mutationFn: (body: { title: string; date: string | null; time: string | null }) =>
      tasksApi.create({
        title: body.title,
        dueDate: body.date,
        dueTime: body.time,
        listId: listId ?? undefined,
        tagIds,
      }),
    onSuccess: () => {
      setTitle("");
      setDate(null);
      setTime(null);
      invalidateAll();
      inputRef.current?.focus();
    },
    onError: (e) => toast("error", "Couldn't add task", (e as Error).message),
  });

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
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            create.mutate({ title: title.trim(), date, time });
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
            className="flex items-center gap-1 rounded-lg bg-accentsoft px-2 py-1 text-xs font-medium text-accentstrong dark:text-accent"
          >
            {date === today ? "Today" : date === addDaysStr(today, 1) ? "Tmrw" : date.slice(5)}
            <XIcon className="size-3" />
          </button>
        ) : null}
        <label
          className="grid size-8 cursor-pointer place-items-center rounded-lg text-inkdim transition-colors hover:bg-card2 hover:text-ink"
          title="Add due date"
        >
          <CalendarIcon className="size-4" />
          <input
            type="date"
            className="sr-only"
            value={date ?? ""}
            onChange={(e) => setDate(e.target.value || null)}
          />
        </label>
      </div>
    </div>
  );
}
