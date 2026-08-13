import type { List, Tag } from "@getitdone/shared";
import {
  addDaysStr,
  describeRecurrence,
  humanDueLabel,
  humanTime,
  parseRecurrenceRule,
  startOfToday,
} from "@getitdone/shared";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/cn";
import { ListIconGlyph } from "../lib/listIcons";
import { CalendarIcon, FlagIcon, RepeatIcon, TagIcon, UserIcon, XIcon } from "./icons";

/* --------------------------------- popover --------------------------------- */

export function Popover({
  trigger,
  children,
  align = "end",
  width = "w-72",
  place = "bottom",
  z = "z-40",
  onOpenChange,
}: {
  trigger: (open: boolean) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  width?: string;
  place?: "top" | "bottom";
  z?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);

  const position = useCallback(() => {
    const host = ref.current;
    const panel = panelRef.current;
    if (!host || !panel) return;
    const hr = host.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const m = 8;
    let below = place !== "top";
    if (below && hr.bottom + pr.height + m > window.innerHeight && hr.top - pr.height - m >= 0) {
      below = false;
    } else if (
      !below &&
      hr.top - pr.height - m < 0 &&
      hr.bottom + pr.height + m <= window.innerHeight
    ) {
      below = true;
    }
    let left = align === "end" ? hr.right - pr.width : hr.left;
    left = Math.max(m, Math.min(left, window.innerWidth - pr.width - m));
    const next: { top?: number; bottom?: number; left: number } = below
      ? { top: hr.height + m, left: left - hr.left }
      : { bottom: hr.height + m, left: left - hr.left };
    setPos((prev) =>
      prev && prev.left === next.left && prev.top === next.top && prev.bottom === next.bottom
        ? prev
        : next,
    );
  }, [place, align]);

  useLayoutEffect(() => {
    if (!open) return;
    position();
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const measure = () => position();
    window.addEventListener("resize", measure);
    document.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      document.removeEventListener("scroll", measure, true);
    };
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => {
          setOpen((o) => {
            onOpenChange?.(!o);
            return !o;
          });
        }}
      >
        {trigger(open)}
      </div>
      {open ? (
        <div
          ref={panelRef}
          style={pos ?? undefined}
          className={cn(
            "anim-fade-in absolute rounded-xl border border-rule bg-card3 p-2 shadow-lift",
            width,
            z,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------- priority --------------------------------- */

export const PRIORITIES = [
  { value: 1, label: "P1", color: "var(--p1)" },
  { value: 2, label: "P2", color: "var(--p2)" },
  { value: 3, label: "P3", color: "var(--p3)" },
  { value: 4, label: "P4", color: "var(--ink-faint)" },
] as const;

export function PriorityPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {PRIORITIES.map((p) => {
        const active = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95",
              active
                ? "border-transparent text-card3"
                : "border-rule bg-card text-inkdim hover:border-rulestrong hover:text-ink",
            )}
            style={active ? { background: p.color } : undefined}
          >
            <FlagIcon className="size-3.5" />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- date ----------------------------------- */

export interface DateTimeValue {
  date: string | null;
  time: string | null;
}

const inputCls =
  "w-full cursor-pointer rounded-lg border border-rule bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent";

export function DateField({
  value,
  onChange,
}: {
  value: DateTimeValue;
  onChange: (v: DateTimeValue) => void;
}) {
  const today = startOfToday();
  const hasDate = !!value.date;
  return (
    <Popover
      trigger={(open) => (
        <button
          type="button"
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
            open ? "border-accent bg-accentsoft" : "border-rule bg-card hover:border-rulestrong",
            hasDate && "text-accentstrong dark:text-accent",
            !hasDate && "text-inkdim",
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">
            {value.date
              ? `${humanDueLabel(value.date)}${value.time ? ` · ${humanTime(value.time)}` : ""}`
              : "Add due date"}
          </span>
          {hasDate ? (
            <XIcon
              className="size-3.5 text-inkfaint"
              onClick={() => onChange({ date: null, time: null })}
            />
          ) : null}
        </button>
      )}
    >
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Today", d: today },
            { label: "Tomorrow", d: addDaysStr(today, 1) },
            { label: "+7 days", d: addDaysStr(today, 7) },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange({ ...value, date: preset.d })}
              className={cn(
                "cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                value.date === preset.d
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
            value={value.date ?? ""}
            onChange={(e) => onChange({ ...value, date: e.target.value || null })}
            className={inputCls}
            aria-label="Due date"
          />
          <input
            type="time"
            value={value.time ?? ""}
            disabled={!value.date}
            onChange={(e) => onChange({ ...value, time: e.target.value || null })}
            className={cn(inputCls, "disabled:opacity-40")}
            aria-label="Due time"
          />
        </div>
      </div>
    </Popover>
  );
}

/* ----------------------------------- list ----------------------------------- */

export function ListPicker({
  value,
  lists,
  onChange,
  onCreate,
}: {
  value: string | null;
  lists: List[];
  onChange: (listId: string | null) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const childrenOf = useMemo(() => {
    const map = new Map<string, List[]>();
    for (const l of lists) {
      const key = l.parentId ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return map;
  }, [lists]);

  function renderOptions(parentKey: string, depth: number) {
    return (childrenOf.get(parentKey) ?? []).map((list) => (
      <div key={list.id}>
        <OptionRow
          active={value === list.id}
          onClick={() => onChange(list.id)}
          indentLevel={depth}
          icon={
            <span
              className="grid size-3.5 place-items-center rounded-full text-card3"
              style={{ background: list.color }}
            >
              {list.icon ? <ListIconGlyph icon={list.icon} className="size-2.5" /> : null}
            </span>
          }
        >
          {list.name}
        </OptionRow>
        {renderOptions(list.id, depth + 1)}
      </div>
    ));
  }

  return (
    <Popover
      trigger={(open) => (
        <button
          type="button"
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
            open ? "border-accent bg-accentsoft" : "border-rule bg-card hover:border-rulestrong",
          )}
        >
          {value ? (
            (() => {
              const list = lists.find((l) => l.id === value);
              return (
                <>
                  <span
                    className="grid size-4 place-items-center rounded-full text-card3"
                    style={{ background: list?.color ?? "var(--ink-faint)" }}
                  >
                    {list?.icon ? <ListIconGlyph icon={list.icon} className="size-3" /> : null}
                  </span>
                  <span className="flex-1 truncate text-left text-ink">
                    {list?.name ?? "Unknown list"}
                  </span>
                </>
              );
            })()
          ) : (
            <>
              <span className="grid size-4 place-items-center rounded-full border border-inkfaint" />
              <span className="flex-1 truncate text-left text-inkdim">No list</span>
            </>
          )}
        </button>
      )}
      width="w-64"
    >
      <div className="max-h-64 overflow-y-auto">
        <OptionRow
          active={value === null}
          onClick={() => onChange(null)}
          icon={<span className="size-3 rounded-full border border-inkfaint" />}
        >
          Inbox (no list)
        </OptionRow>
        {renderOptions("", 0)}
      </div>
      <form
        className="mt-1.5 flex items-center gap-1.5 border-t border-rule pt-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onCreate(name.trim());
            setName("");
          }
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New list…"
          className="w-full bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-inkfaint"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-card3 transition-transform active:scale-95"
        >
          Add
        </button>
      </form>
    </Popover>
  );
}

function OptionRow({
  children,
  icon,
  onClick,
  active,
  indentLevel = 0,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  active: boolean;
  indentLevel?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ paddingLeft: indentLevel > 0 ? 10 + indentLevel * 14 : undefined }}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        active
          ? "bg-accentsoft font-semibold text-ink"
          : "text-inkdim hover:bg-card2 hover:text-ink",
      )}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {active ? <span className="size-1.5 rounded-full bg-accent" /> : null}
    </button>
  );
}

/* ----------------------------------- tags ----------------------------------- */

export function TagPicker({
  value,
  tags,
  onToggle,
  onCreate,
}: {
  value: string[];
  tags: Tag[];
  onToggle: (tagId: string) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <Popover
      trigger={(open) => (
        <button
          type="button"
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
            open ? "border-accent bg-accentsoft" : "border-rule bg-card hover:border-rulestrong",
          )}
        >
          <TagIcon className="size-4 shrink-0 text-inkdim" />
          <span className="flex-1 truncate text-left text-inkdim">
            {value.length === 0 ? "Add tags" : `${value.length} tag${value.length > 1 ? "s" : ""}`}
          </span>
          {value.length > 0 ? (
            <span className="flex -space-x-1">
              {tags
                .filter((t) => value.includes(t.id))
                .slice(0, 4)
                .map((t) => (
                  <span
                    key={t.id}
                    className="size-2.5 rounded-full ring-2 ring-card3"
                    style={{ background: t.color }}
                  />
                ))}
            </span>
          ) : null}
        </button>
      )}
      width="w-64"
    >
      <div className="max-h-60 overflow-y-auto">
        {tags.map((tag) => {
          const selected = value.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                selected
                  ? "bg-accentsoft font-semibold text-ink"
                  : "text-inkdim hover:bg-card2 hover:text-ink",
              )}
            >
              <span className="size-2.5 rounded-full" style={{ background: tag.color }} />
              <span className="flex-1 truncate">#{tag.name}</span>
              {selected ? <span className="size-1.5 rounded-full bg-accent" /> : null}
            </button>
          );
        })}
        {tags.length === 0 ? (
          <p className="px-2.5 py-3 text-xs text-inkfaint">No tags yet — create one below.</p>
        ) : null}
      </div>
      <form
        className="mt-1.5 flex items-center gap-1.5 border-t border-rule pt-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onCreate(name.trim());
            setName("");
          }
        }}
      >
        <span className="pl-2 text-xs text-inkfaint">#</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New tag…"
          className="w-full bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-inkfaint"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-card3 transition-transform active:scale-95"
        >
          Add
        </button>
      </form>
    </Popover>
  );
}

/* --------------------------------- assignee --------------------------------- */

export function AssigneeField({
  value,
  suggestions,
  onChange,
}: {
  value: string | null;
  suggestions: string[];
  onChange: (value: string | null) => void;
}) {
  const [text, setText] = useState(value ?? "");
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value ?? "");
  }, [value]);

  useEffect(() => {
    if (!show) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [show]);

  const q = text.trim().toLowerCase();
  const matches = (q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions).slice(
    0,
    6,
  );

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-rule bg-card px-3 py-2 transition-colors focus-within:border-accent">
        <UserIcon className="size-4 shrink-0 text-inkdim" />
        <input
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            setShow(true);
            onChange(v.trim() ? v.trim() : null);
          }}
          onFocus={() => setShow(true)}
          placeholder="Assign to someone…"
          aria-label="Assignee"
          className="w-full flex-1 bg-transparent text-sm outline-none placeholder:text-inkfaint"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setText("");
              onChange(null);
            }}
            aria-label="Clear assignee"
            className="cursor-pointer rounded-md p-0.5 text-inkfaint transition-colors hover:text-accent"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
      {show && matches.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-rule bg-card3 p-1 shadow-lift">
          {matches.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setText(name);
                setShow(false);
                onChange(name);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-inkdim transition-colors hover:bg-card2 hover:text-ink"
            >
              <UserIcon className="size-3.5" />
              <span className="flex-1 truncate">{name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------- recurrence -------------------------------- */

const RECUR_PRESETS = [
  { rule: "FREQ=DAILY", label: "Every day" },
  { rule: "FREQ=WEEKLY", label: "Every week" },
  { rule: "FREQ=WEEKLY;BYDAY=MO,WE,FR", label: "Mon · Wed · Fri" },
  { rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", label: "Weekdays" },
  { rule: "FREQ=MONTHLY", label: "Monthly" },
  { rule: "FREQ=MONTHLY;BYMONTHDAY=1", label: "Monthly · 1st" },
];

export function RecurrenceField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (rule: string | null) => void;
}) {
  const [custom, setCustom] = useState("");
  const safeLabel = (() => {
    try {
      return value ? describeRecurrence(value) : null;
    } catch {
      return "Custom repeat";
    }
  })();

  return (
    <Popover
      trigger={(open) => (
        <button
          type="button"
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
            open ? "border-accent bg-accentsoft" : "border-rule bg-card hover:border-rulestrong",
            value ? "text-ink" : "text-inkdim",
          )}
        >
          <RepeatIcon className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">{value ? safeLabel : "Repeat"}</span>
          {value ? (
            <XIcon className="size-3.5 text-inkfaint" onClick={() => onChange(null)} />
          ) : null}
        </button>
      )}
      width="w-64"
    >
      <div className="grid grid-cols-2 gap-1.5">
        {RECUR_PRESETS.map((preset) => (
          <button
            key={preset.rule}
            type="button"
            onClick={() => onChange(preset.rule)}
            className={cn(
              "cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
              value === preset.rule
                ? "border-accent bg-accentsoft text-accentstrong dark:text-accent"
                : "border-rule bg-card text-inkdim hover:text-ink",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <form
        className="mt-1.5 border-t border-rule pt-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            parseRecurrenceRule(custom);
            onChange(custom);
            setCustom("");
          } catch {
            /* invalid — keep typing */
          }
        }}
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Custom RRULE e.g. FREQ=WEEKLY;BYDAY=TU;INTERVAL=2"
          className="w-full bg-transparent px-2 py-1.5 font-mono text-xs outline-none placeholder:text-inkfaint"
        />
      </form>
    </Popover>
  );
}
