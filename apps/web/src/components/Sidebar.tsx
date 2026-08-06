import type { List } from "@getitdone/shared";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { NavLink } from "react-router";
import type { ThemeMode } from "../hooks/useTheme";
import type { Bootstrap } from "../lib/api";
import { listsApi, tagsApi } from "../lib/api";
import { cn } from "../lib/cn";
import { invalidateAll } from "../lib/mutations";
import { Popover } from "./fields";
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InboxIcon,
  LayersIcon,
  ListIcon,
  LogoutIcon,
  MoonIcon,
  PlusIcon,
  SparkIcon,
  StampIcon,
  SunIcon,
  TagIcon,
  TrashIcon,
} from "./icons";
import { useToast } from "./ui";

const PALETTE = [
  "#E2502E",
  "#E08A00",
  "#2F7A6D",
  "#5B6EE8",
  "#8A5BC8",
  "#C85B8A",
  "#4A8A5B",
  "#6F6959",
];

const ROOT_PARENT = "__root__";

function NavItem({
  to,
  icon,
  label,
  count,
  color,
  end,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  color?: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] transition-all",
          isActive
            ? "bg-card font-semibold text-ink shadow-sm ring-1 ring-rule"
            : "text-inkdim hover:bg-card/60 hover:text-ink",
        )
      }
    >
      <span
        className="grid size-5 shrink-0 place-items-center"
        style={color ? { color } : undefined}
      >
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {typeof count === "number" ? (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 font-mono text-[10.5px] tabnum",
            count > 0 ? "bg-accentsoft text-accentstrong dark:text-accent" : "text-inkfaint",
          )}
        >
          {count}
        </span>
      ) : null}
    </NavLink>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pb-1.5 pt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-inkfaint">
      {children}
    </p>
  );
}

function ListCreateForm({
  name,
  onName,
  color,
  onColor,
  onSubmit,
  onCancel,
}: {
  name: string;
  onName: (v: string) => void;
  color: string;
  onColor: (c: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="space-y-2 rounded-xl border border-rule bg-card p-2.5 anim-fade-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSubmit();
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="List name"
        className="w-full bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-inkfaint"
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColor(c)}
              aria-label={`Color ${c}`}
              className={cn(
                "size-4 cursor-pointer rounded-full transition-transform",
                color === c && "scale-125 ring-2 ring-accent ring-offset-1 ring-offset-card",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-rule px-2.5 py-1 text-xs text-inkdim transition-colors hover:bg-card2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-card3 transition-transform active:scale-95 disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </form>
  );
}

export function Sidebar({
  data,
  user,
  onLogout,
  onNavigate,
  theme,
  setTheme,
}: {
  data: Bootstrap;
  user: Bootstrap["user"];
  onLogout: () => void;
  onNavigate?: () => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}) {
  const { toast } = useToast();
  const [creatingParent, setCreatingParent] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(PALETTE[0] ?? "#E2502E");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameTagValue, setRenameTagValue] = useState("");
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<string | null>(null);

  const lists = data.lists;
  const tags = data.tags;

  const invalidate = () => invalidateAll();

  const childrenOf = useMemo(() => {
    const map = new Map<string, List[]>();
    for (const l of lists) {
      const key = l.parentId ?? ROOT_PARENT;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return map;
  }, [lists]);

  const createList = useMutation({
    mutationFn: () =>
      listsApi.create({
        name: newName.trim(),
        color: newColor,
        parentId: creatingParent === ROOT_PARENT ? null : creatingParent,
      }),
    onSuccess: () => {
      setNewName("");
      setCreatingParent(null);
      invalidate();
      toast("success", "List created");
    },
  });

  const updateList = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => listsApi.update(id, { name }),
    onSuccess: () => {
      setRenaming(null);
      invalidate();
    },
  });

  const deleteList = useMutation({
    mutationFn: (id: string) => listsApi.remove(id),
    onSuccess: () => {
      setConfirmDelete(null);
      invalidate();
      toast("success", "List deleted");
    },
  });

  const moveList = useMutation({
    mutationFn: (ordered: string[]) => listsApi.reorder(ordered),
    onSuccess: invalidate,
  });

  function moveSiblings(siblings: List[], index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= siblings.length) return;
    const next = [...siblings];
    [next[index], next[target]] = [next[target]!, next[index]!];
    moveList.mutate(next.map((l) => l.id));
  }

  function openSubCreate(list: List) {
    setNewName("");
    setNewColor(list.color);
    setCreatingParent(list.id);
  }

  function renderLists(parentKey: string, depth: number) {
    const siblings = childrenOf.get(parentKey) ?? [];
    return siblings.map((list, index) => {
      const hasChildren = (childrenOf.get(list.id) ?? []).length > 0;
      return (
        <div key={list.id}>
          <div className="group relative flex items-center">
            <NavLink
              to={`/list/${list.id}`}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-xl py-2 pr-2.5 text-[13.5px] transition-colors",
                  isActive
                    ? "bg-card font-semibold text-ink shadow-sm ring-1 ring-rule"
                    : "text-inkdim hover:bg-card/60 hover:text-ink",
                )
              }
              style={{ paddingLeft: 10 + depth * 16 }}
            >
              <span
                className="grid size-5 shrink-0 place-items-center rounded-lg text-[10px] font-semibold text-card3"
                style={{ background: list.color }}
              >
                {list.icon ?? <ListIcon className="size-3.5" strokeWidth={2.2} />}
              </span>
              <span className="truncate">{list.name}</span>
            </NavLink>
            <Popover
              trigger={() => (
                <button
                  type="button"
                  aria-label={`Options for ${list.name}`}
                  className="mr-1 grid size-6 cursor-pointer place-items-center rounded-md text-inkfaint opacity-0 transition-all hover:bg-card2 hover:text-ink group-hover:opacity-100"
                >
                  <span className="text-[10px] tracking-widest">⋯</span>
                </button>
              )}
              width="w-44"
            >
              <div className="space-y-0.5">
                {renaming === list.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (renameValue.trim())
                        updateList.mutate({ id: list.id, name: renameValue.trim() });
                    }}
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-full rounded-lg border border-accent bg-card px-2 py-1.5 text-sm outline-none"
                    />
                  </form>
                ) : (
                  <MenuButton
                    icon={<ListIcon className="size-3.5" />}
                    onClick={() => {
                      setRenaming(list.id);
                      setRenameValue(list.name);
                    }}
                  >
                    Rename
                  </MenuButton>
                )}
                <MenuButton
                  icon={<LayersIcon className="size-3.5" />}
                  onClick={() => openSubCreate(list)}
                >
                  New sub-list
                </MenuButton>
                <div className="grid grid-cols-2 gap-0.5">
                  <MenuButton
                    icon={<ChevronUpIcon className="size-3.5" />}
                    onClick={() => moveSiblings(siblings, index, -1)}
                  >
                    Up
                  </MenuButton>
                  <MenuButton
                    icon={<ChevronDownIcon className="size-3.5" />}
                    onClick={() => moveSiblings(siblings, index, 1)}
                  >
                    Down
                  </MenuButton>
                </div>
                {confirmDelete === list.id ? (
                  <div className="space-y-1 pt-1">
                    <p className="px-2 text-xs text-inkdim">
                      {hasChildren
                        ? "Sub-lists move to the root. Delete?"
                        : "Move tasks to inbox and delete?"}
                    </p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => deleteList.mutate(list.id)}
                        className="flex-1 cursor-pointer rounded-lg bg-accent px-2 py-1.5 text-xs font-semibold text-card3"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 cursor-pointer rounded-lg border border-rule px-2 py-1.5 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <MenuButton
                    icon={<TrashIcon className="size-3.5" />}
                    onClick={() => setConfirmDelete(list.id)}
                    danger
                  >
                    Delete
                  </MenuButton>
                )}
              </div>
            </Popover>
          </div>
          {creatingParent === list.id ? (
            <div className="my-1 anim-fade-in" style={{ marginLeft: 10 + depth * 16 }}>
              <ListCreateForm
                name={newName}
                onName={setNewName}
                color={newColor}
                onColor={setNewColor}
                onSubmit={() => createList.mutate()}
                onCancel={() => setCreatingParent(null)}
              />
            </div>
          ) : null}
          {renderLists(list.id, depth + 1)}
        </div>
      );
    });
  }

  const createTag = useMutation({
    mutationFn: (name: string) => tagsApi.create({ name }),
    onSuccess: () => {
      invalidate();
      toast("success", "Tag created");
    },
  });

  const updateTag = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => tagsApi.update(id, { name }),
    onSuccess: () => {
      setRenamingTag(null);
      invalidate();
    },
  });

  const deleteTag = useMutation({
    mutationFn: (id: string) => tagsApi.remove(id),
    onSuccess: () => {
      setConfirmDeleteTag(null);
      invalidate();
      toast("success", "Tag deleted");
    },
  });

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-5">
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-card3 shadow-lift">
          <StampIcon className="size-5" strokeWidth={2} />
        </span>
        <div className="leading-tight">
          <h1 className="font-display text-xl italic font-semibold tracking-tight text-ink">
            Get It <span className="text-accent">Done</span>
          </h1>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-inkfaint">
            personal edition
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <SectionLabel>Views</SectionLabel>
        <div className="space-y-0.5">
          <NavItem
            to="/inbox"
            icon={<InboxIcon className="size-5" />}
            label="Inbox"
            count={data.counts.inbox}
            end
          />
          <NavItem
            to="/today"
            icon={<SparkIcon className="size-5" />}
            label="Today"
            count={data.counts.today}
            end
          />
          <NavItem
            to="/week"
            icon={<CalendarIcon className="size-5" />}
            label="Next 7 Days"
            count={data.counts.week}
            end
          />
          <NavItem
            to="/all"
            icon={<LayersIcon className="size-5" />}
            label="All Tasks"
            count={data.counts.all}
            end
          />
          <NavItem
            to="/completed"
            icon={<CheckIcon className="size-5" />}
            label="Completed"
            count={data.counts.completed}
            end
          />
        </div>

        <SectionLabel>
          <span className="flex items-center justify-between">
            Lists
            <button
              type="button"
              onClick={() => setCreatingParent((p) => (p === ROOT_PARENT ? null : ROOT_PARENT))}
              aria-label="New list"
              className="grid size-5 cursor-pointer place-items-center rounded-md text-inkfaint transition-colors hover:bg-card2 hover:text-accent"
            >
              <PlusIcon className="size-3.5" strokeWidth={2.4} />
            </button>
          </span>
        </SectionLabel>

        {creatingParent === ROOT_PARENT ? (
          <div className="mb-2 anim-fade-in">
            <ListCreateForm
              name={newName}
              onName={setNewName}
              color={newColor}
              onColor={setNewColor}
              onSubmit={() => createList.mutate()}
              onCancel={() => setCreatingParent(null)}
            />
          </div>
        ) : null}

        <div className="space-y-0.5">
          {lists.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-inkfaint">
              No lists yet — make one for each part of your life.
            </p>
          ) : (
            renderLists(ROOT_PARENT, 0)
          )}
        </div>

        <SectionLabel>
          <span className="flex items-center justify-between">
            Tags
            <button
              type="button"
              onClick={() => createTag.mutate(`tag-${tags.length + 1}`)}
              aria-label="New tag"
              className="grid size-5 cursor-pointer place-items-center rounded-md text-inkfaint transition-colors hover:bg-card2 hover:text-accent"
            >
              <PlusIcon className="size-3.5" strokeWidth={2.4} />
            </button>
          </span>
        </SectionLabel>
        <div className="flex flex-wrap gap-1.5 px-0.5">
          {tags.map((tag) => (
            <div key={tag.id} className="group relative flex items-center">
              <NavLink
                to={`/tag/${tag.id}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    isActive
                      ? "border-accent bg-accentsoft font-semibold text-ink"
                      : "border-rule bg-card text-inkdim hover:text-ink",
                  )
                }
              >
                <span className="size-2 rounded-full" style={{ background: tag.color }} />
                {tag.name}
              </NavLink>
              <Popover
                trigger={() => (
                  <button
                    type="button"
                    aria-label={`Options for ${tag.name}`}
                    className="ml-0.5 grid size-5 cursor-pointer place-items-center rounded-full text-inkfaint opacity-0 transition-all hover:bg-card2 hover:text-ink group-hover:opacity-100"
                  >
                    <span className="text-[9px] tracking-widest">⋯</span>
                  </button>
                )}
                width="w-44"
              >
                <div className="space-y-0.5">
                  {renamingTag === tag.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (renameTagValue.trim())
                          updateTag.mutate({ id: tag.id, name: renameTagValue.trim() });
                      }}
                    >
                      <input
                        autoFocus
                        value={renameTagValue}
                        onChange={(e) => setRenameTagValue(e.target.value)}
                        className="w-full rounded-lg border border-accent bg-card px-2 py-1.5 text-sm outline-none"
                      />
                    </form>
                  ) : (
                    <MenuButton
                      icon={<TagIcon className="size-3.5" />}
                      onClick={() => {
                        setRenamingTag(tag.id);
                        setRenameTagValue(tag.name);
                      }}
                    >
                      Rename
                    </MenuButton>
                  )}
                  {confirmDeleteTag === tag.id ? (
                    <div className="space-y-1 pt-1">
                      <p className="px-2 text-xs text-inkdim">Remove this tag from all tasks?</p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => deleteTag.mutate(tag.id)}
                          className="flex-1 cursor-pointer rounded-lg bg-accent px-2 py-1.5 text-xs font-semibold text-card3"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTag(null)}
                          className="flex-1 cursor-pointer rounded-lg border border-rule px-2 py-1.5 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <MenuButton
                      icon={<TrashIcon className="size-3.5" />}
                      onClick={() => setConfirmDeleteTag(tag.id)}
                      danger
                    >
                      Delete
                    </MenuButton>
                  )}
                </div>
              </Popover>
            </div>
          ))}
          {tags.length === 0 ? <p className="px-1 text-xs text-inkfaint">No tags yet.</p> : null}
        </div>
      </nav>

      <div className="border-t border-rule px-4 py-3">
        <div className="mb-2 grid grid-cols-3 gap-1 rounded-xl bg-card p-1">
          {(
            [
              { mode: "light" as const, icon: <SunIcon className="size-3.5" />, label: "Light" },
              { mode: "dark" as const, icon: <MoonIcon className="size-3.5" />, label: "Dark" },
              { mode: "system" as const, icon: <SparkIcon className="size-3.5" />, label: "Auto" },
            ] as const
          ).map((t) => (
            <button
              key={t.mode}
              type="button"
              onClick={() => setTheme(t.mode)}
              aria-label={`${t.label} theme`}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] transition-colors",
                theme === t.mode
                  ? "bg-card3 font-semibold text-ink shadow-sm"
                  : "text-inkfaint hover:text-ink",
              )}
            >
              {t.icon}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card2 font-display text-sm italic text-ink">
            {(user.displayName ?? user.email)[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium text-ink">
              {user.displayName ?? user.email}
            </p>
            <p className="truncate font-mono text-[10px] text-inkfaint">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            title="Log out"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-inkfaint transition-colors hover:bg-card2 hover:text-accent"
          >
            <LogoutIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuButton({
  children,
  icon,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
        danger ? "text-accent hover:bg-accent/10" : "text-inkdim hover:bg-card2 hover:text-ink",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
