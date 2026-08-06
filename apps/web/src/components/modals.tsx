import type { List, Tag } from "@getitdone/shared";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "../lib/cn";
import { LIST_ICONS, PALETTE } from "../lib/listIcons";
import { ListIcon, XIcon } from "./icons";

export interface ListModalInput {
  name: string;
  color: string;
  icon: string | null;
  parentId: string | null;
}

/* --------------------------------- modal --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="anim-fade-in absolute inset-0 bg-ink/40 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "anim-pop relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-rule bg-paper shadow-lift",
          wide ? "max-w-lg" : "max-w-md",
        )}
      >
        <header className="flex items-center justify-between border-b border-rule px-5 py-3.5">
          <h2 className="font-display text-lg italic font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-inkdim transition-colors hover:bg-card hover:text-ink"
          >
            <XIcon className="size-4" />
          </button>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------ confirm modal ----------------------------- */

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-inkdim">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg border border-rule px-3.5 py-1.5 text-sm text-inkdim transition-colors hover:bg-card2 hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="cursor-pointer rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-card3 transition-transform active:scale-95"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* -------------------------------- list modal ------------------------------ */

export function ListModal({
  open,
  onClose,
  onSubmit,
  parentId,
  list,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ListModalInput) => void;
  parentId?: string | null;
  list?: List;
}) {
  const isRename = Boolean(list);
  const [name, setName] = useState(list?.name ?? "");
  const [color, setColor] = useState<string>(list?.color ?? PALETTE[0] ?? "#E2502E");
  const [icon, setIcon] = useState<string | null>(list?.icon ?? null);

  useEffect(() => {
    if (open) {
      setName(list?.name ?? "");
      setColor(list?.color ?? PALETTE[0] ?? "#E2502E");
      setIcon(list?.icon ?? null);
    }
  }, [open, list]);

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), color, icon, parentId: parentId ?? null });
  };

  return (
    <Modal open={open} onClose={onClose} title={isRename ? "Rename list" : "New list"} wide>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="list-name"
            className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-inkfaint"
          >
            Name
          </label>
          <input
            id="list-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Work, Groceries, Ideas…"
            className="w-full rounded-xl border border-rule bg-card px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-inkfaint focus:border-accent"
          />
        </div>

        <div>
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-inkfaint">
            Icon
          </span>
          <div className="grid grid-cols-6 gap-1.5">
            <button
              type="button"
              onClick={() => setIcon(null)}
              aria-label="No icon"
              title="No icon"
              className={cn(
                "grid aspect-square cursor-pointer place-items-center rounded-lg border transition-all",
                icon === null
                  ? "border-accent bg-accentsoft ring-2 ring-accent/30"
                  : "border-rule text-inkdim hover:border-rulestrong hover:text-ink",
              )}
            >
              <ListIcon className="size-4" strokeWidth={2} />
            </button>
            {LIST_ICONS.map((d) => {
              const I = d.Icon;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setIcon(d.key)}
                  aria-label={d.label}
                  title={d.label}
                  className={cn(
                    "grid aspect-square cursor-pointer place-items-center rounded-lg border transition-all",
                    icon === d.key
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-rule hover:border-rulestrong",
                  )}
                >
                  <I className="size-4" style={{ color: d.color }} strokeWidth={2} />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-inkfaint">
            Color
          </span>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={cn(
                  "size-6 cursor-pointer rounded-full transition-transform",
                  color === c && "scale-110 ring-2 ring-accent ring-offset-2 ring-offset-paper",
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg border border-rule px-3.5 py-1.5 text-sm text-inkdim transition-colors hover:bg-card2 hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="cursor-pointer rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-card3 transition-transform active:scale-95 disabled:opacity-40"
        >
          {isRename ? "Save" : "Create"}
        </button>
      </div>
    </Modal>
  );
}

/* -------------------------------- tag modal ------------------------------- */

export function TagModal({
  open,
  onClose,
  onSubmit,
  tag,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  tag?: Tag;
}) {
  const isRename = Boolean(tag);
  const [name, setName] = useState(tag?.name ?? "");

  useEffect(() => {
    if (open) setName(tag?.name ?? "");
  }, [open, tag]);

  const submit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim());
  };

  return (
    <Modal open={open} onClose={onClose} title={isRename ? "Rename tag" : "New tag"}>
      <label
        htmlFor="tag-name"
        className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-inkfaint"
      >
        Name
      </label>
      <input
        id="tag-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="e.g. urgent, errand, read later…"
        className="w-full rounded-xl border border-rule bg-card px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-inkfaint focus:border-accent"
      />
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg border border-rule px-3.5 py-1.5 text-sm text-inkdim transition-colors hover:bg-card2 hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="cursor-pointer rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-card3 transition-transform active:scale-95 disabled:opacity-40"
        >
          {isRename ? "Save" : "Create"}
        </button>
      </div>
    </Modal>
  );
}
