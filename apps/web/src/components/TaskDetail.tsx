import { humanDueLabel, humanTime, type List, type Subtask, type Tag } from "@getitdone/shared";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { listsApi, type TaskWithRelations, tagsApi, tasksApi } from "../lib/api";
import { cn } from "../lib/cn";
import { invalidateAll } from "../lib/mutations";
import {
  AssigneeField,
  DateField,
  type DateTimeValue,
  ListPicker,
  PriorityPicker,
  RecurrenceField,
  TagPicker,
} from "./fields";
import { CalendarIcon, NoteIcon, PlusIcon, RepeatIcon, TrashIcon, UserIcon, XIcon } from "./icons";
import { PriorityBadge } from "./PriorityBadge";
import { Checkbox, useToast } from "./ui";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-inkfaint">
        {label}
      </h3>
      {children}
    </div>
  );
}

export function TaskDetail({
  task,
  lists,
  tags,
  assignees,
  onClose,
  onChanged,
}: {
  task: TaskWithRelations;
  lists: List[];
  tags: Tag[];
  assignees: string[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(task.title);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [notes, setNotes] = useState(task.notes ?? "");
  const notesRef = useRef(notes);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesAreaRef = useRef<HTMLTextAreaElement>(null);
  const [due, setDue] = useState<DateTimeValue>({ date: task.dueDate, time: task.dueTime });
  const [priority, setPriority] = useState<number>(task.priority);
  const [listId, setListId] = useState<string | null>(task.listId);
  const [recurrence, setRecurrence] = useState<string | null>(task.recurrence);
  const [tagIds, setTagIds] = useState<string[]>(task.tags.map((t) => t.id));
  const [assignee, setAssignee] = useState<string | null>(task.assignee);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks);
  const [subInput, setSubInput] = useState("");
  const completed = !!task.completedAt;

  function refetch() {
    invalidateAll();
    onChanged();
  }

  const patch = useMutation({
    mutationFn: (body: Parameters<typeof tasksApi.update>[1]) => tasksApi.update(task.id, body),
    onSuccess: refetch,
    onError: (e) => toast("error", "Couldn't save", (e as Error).message),
  });

  function save(p: Parameters<typeof tasksApi.update>[1]) {
    patch.mutate(p);
  }

  function saveNotes(value: string) {
    if (value !== (task.notes ?? "")) save({ notes: value || null });
  }

  function flushNotes() {
    if (notesTimer.current) {
      clearTimeout(notesTimer.current);
      notesTimer.current = null;
    }
    saveNotes(notesRef.current);
  }

  useEffect(
    () => () => {
      if (notesTimer.current) clearTimeout(notesTimer.current);
    },
    [],
  );

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    const el = notesAreaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const toggleComplete = useMutation({
    mutationFn: () => tasksApi.complete(task.id, !completed),
    onSuccess: (res) => {
      flushNotes();
      refetch();
      onClose();
      if (res.next?.dueDate) {
        toast(
          "success",
          "Completed — next up",
          `Next occurrence: ${humanDueLabel(res.next.dueDate)}${res.next.dueTime ? ` at ${humanTime(res.next.dueTime)}` : ""}`,
        );
      }
    },
    onError: (e) => toast("error", "Couldn't update", (e as Error).message),
  });

  const del = useMutation({
    mutationFn: () => tasksApi.remove(task.id),
    onSuccess: () => {
      refetch();
      onClose();
      toast("success", "Task deleted");
    },
    onError: (e) => toast("error", "Couldn't delete", (e as Error).message),
  });

  const tagMutation = useMutation({
    mutationFn: ({ tagId, add }: { tagId: string; add: boolean }) =>
      add ? tasksApi.addTag(task.id, tagId) : tasksApi.removeTag(task.id, tagId),
    onSuccess: refetch,
  });

  const subMutation = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: refetch,
  });

  function addSubtask() {
    const titleText = subInput.trim();
    if (!titleText) return;
    setSubInput("");
    subMutation.mutate(async () => {
      const res = await tasksApi.addSubtask(task.id, titleText);
      setSubtasks((prev) => [...prev, res.subtask]);
    });
  }

  function toggleSubtask(sub: Subtask) {
    const next = !sub.completedAt;
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === sub.id ? { ...s, completedAt: next ? new Date().toISOString() : null } : s,
      ),
    );
    subMutation.mutate(async () => {
      const res = await tasksApi.completeSubtask(sub.id, next);
      setSubtasks((prev) => prev.map((s) => (s.id === sub.id ? res.subtask : s)));
    });
  }

  function deleteSubtask(sub: Subtask) {
    setSubtasks((prev) => prev.filter((s) => s.id !== sub.id));
    subMutation.mutate(async () => {
      await tasksApi.deleteSubtask(sub.id);
    });
  }

  const doneCount = subtasks.filter((s) => s.completedAt).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="anim-fade-in absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
        className="anim-drawer relative flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-rule bg-paper shadow-lift"
      >
        <header className="flex items-start gap-3 border-b border-rule px-5 py-4">
          <div className="mt-1 flex flex-1 flex-col gap-1">
            <textarea
              ref={titleRef}
              value={title}
              onChange={(e) => {
                const v = e.target.value;
                setTitle(v);
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              onBlur={() => title.trim() && title !== task.title && save({ title: title.trim() })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
              rows={1}
              placeholder="Task title"
              className="w-full resize-none bg-transparent text-xl leading-snug font-semibold text-ink outline-none placeholder:text-inkfaint"
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkfaint tabnum">
              {completed ? "Completed" : "Open"} · {new Date(task.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Checkbox
            checked={completed}
            onToggle={() => toggleComplete.mutate()}
            accent="var(--ok)"
            className="mt-1"
            label="Complete task"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 cursor-pointer place-items-center rounded-xl text-inkdim transition-colors hover:bg-card hover:text-ink"
          >
            <XIcon className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            <Section label="Due">
              <DateField
                value={due}
                onChange={(v) => {
                  setDue(v);
                  save({ dueDate: v.date, dueTime: v.date ? v.time : null });
                }}
              />
            </Section>
            <Section label="Repeat">
              <RecurrenceField
                value={recurrence}
                onChange={(rule) => {
                  setRecurrence(rule);
                  save({ recurrence: rule });
                }}
              />
            </Section>
          </div>

          <Section label="Priority">
            <div className="flex items-center gap-2">
              <PriorityBadge priority={priority} size="md" />
              <PriorityPicker
                value={priority}
                onChange={(p) => {
                  setPriority(p);
                  save({ priority: p as 1 | 2 | 3 | 4 });
                }}
              />
            </div>
          </Section>

          <Section label="Assignee">
            <AssigneeField
              value={assignee}
              suggestions={assignees}
              onChange={(v) => {
                setAssignee(v);
                save({ assignee: v });
              }}
            />
          </Section>

          <div className="space-y-4">
            <Section label="List">
              <ListPicker
                value={listId}
                lists={lists}
                onChange={(id) => {
                  setListId(id);
                  save({ listId: id });
                }}
                onCreate={(name) => {
                  listsApi.create({ name }).then(() => refetch());
                }}
              />
            </Section>
            <Section label="Tags">
              <TagPicker
                value={tagIds}
                tags={tags}
                onToggle={(tagId) => {
                  const add = !tagIds.includes(tagId);
                  setTagIds((prev) => (add ? [...prev, tagId] : prev.filter((t) => t !== tagId)));
                  tagMutation.mutate({ tagId, add });
                }}
                onCreate={(name) => {
                  tagsApi.create({ name }).then(() => refetch());
                }}
              />
            </Section>
          </div>

          <Section label="Notes">
            <div className="rounded-xl border border-rule bg-card focus-within:border-accent">
              <div className="flex items-center gap-2 px-3 pt-2 text-inkfaint">
                <NoteIcon className="size-3.5" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Notes</span>
              </div>
              <textarea
                ref={notesAreaRef}
                value={notes}
                onChange={(e) => {
                  const v = e.target.value;
                  setNotes(v);
                  notesRef.current = v;
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                  if (notesTimer.current) clearTimeout(notesTimer.current);
                  notesTimer.current = setTimeout(saveNotes, 600, v);
                }}
                onBlur={flushNotes}
                rows={8}
                placeholder="Details, links, context…"
                className="min-h-32 w-full resize-y bg-transparent px-3 pb-3 text-sm leading-relaxed text-ink outline-none placeholder:text-inkfaint"
              />
            </div>
          </Section>

          <Section label={`Subtasks · ${doneCount}/${subtasks.length}`}>
            <ul className="space-y-0.5">
              {subtasks.map((sub) => (
                <li
                  key={sub.id}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-card"
                >
                  <Checkbox
                    checked={!!sub.completedAt}
                    onToggle={() => toggleSubtask(sub)}
                    accent="var(--ok)"
                    label={`Mark subtask "${sub.title}" done`}
                  />
                  <span
                    className={cn(
                      "flex-1 text-sm text-ink transition-colors",
                      sub.completedAt && "text-inkfaint line-through",
                    )}
                  >
                    {sub.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteSubtask(sub)}
                    aria-label={`Delete subtask "${sub.title}"`}
                    className="cursor-pointer rounded-md p-1 text-inkfaint opacity-0 transition-all hover:text-accent group-hover:opacity-100"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-rule px-2 py-1.5 focus-within:border-accent"
              onSubmit={(e) => {
                e.preventDefault();
                addSubtask();
              }}
            >
              <PlusIcon className="size-3.5 text-inkfaint" />
              <input
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                placeholder="Add a subtask…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-inkfaint"
              />
            </form>
          </Section>
        </div>

        <footer className="flex items-center justify-between border-t border-rule px-5 py-3">
          <button
            type="button"
            onClick={() => del.mutate()}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-inkfaint transition-colors hover:bg-accent/10 hover:text-accent"
          >
            <TrashIcon className="size-4" />
            Delete
          </button>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-inkfaint">
            {task.assignee ? (
              <span className="flex items-center gap-1">
                <UserIcon className="size-3" />
                {task.assignee}
              </span>
            ) : null}
            {task.dueDate ? (
              <span className="flex items-center gap-1">
                <CalendarIcon className="size-3" />
                {humanDueLabel(task.dueDate)}
              </span>
            ) : null}
            {task.recurrence ? <RepeatIcon className="size-3" /> : null}
          </div>
        </footer>
      </aside>
    </div>
  );
}
