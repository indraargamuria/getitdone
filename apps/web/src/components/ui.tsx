import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { CheckIcon, XIcon } from "./icons";

/* --------------------------------- toasts --------------------------------- */

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

const ToastContext = createContext<{
  toast: (kind: ToastKind, title: string, message?: string) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let toastSeq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = toastSeq++;
      setToasts((prev) => [...prev.slice(-3), { id, kind, title, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), kind === "error" ? 5000 : 3200),
      );
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-6 sm:left-auto sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "anim-toast pointer-events-auto w-full max-w-sm rounded-xl border bg-card3 px-4 py-3 shadow-lift",
              "border-l-4",
              t.kind === "success" && "border-l-ok",
              t.kind === "error" && "border-l-accent",
              t.kind === "info" && "border-l-cool",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-card3",
                  t.kind === "success" && "bg-ok",
                  t.kind === "error" && "bg-accent",
                  t.kind === "info" && "bg-cool",
                )}
              >
                <CheckIcon className="size-3" strokeWidth={2.6} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.message ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-inkdim">{t.message}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-md p-1 text-inkfaint transition-colors hover:bg-card2 hover:text-ink"
                aria-label="Dismiss"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* -------------------------------- checkbox -------------------------------- */

export function Checkbox({
  checked,
  onToggle,
  className,
  accent = "var(--accent)",
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  className?: string;
  accent?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "tick group grid size-[22px] shrink-0 cursor-pointer place-items-center rounded-[7px] border transition-all",
        checked
          ? "border-transparent"
          : "border-rulestrong bg-card hover:border-accent hover:bg-accentsoft",
        className,
      )}
      style={checked ? { background: accent } : undefined}
    >
      <svg viewBox="0 0 24 24" className="size-3 text-card3">
        <path
          d="m5 12.5 4.5 4.5L19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/* ------------------------------- empty state ------------------------------- */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="anim-fade-in flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-rulestrong bg-card text-inkfaint">
        {icon}
      </div>
      <h3 className="mt-5 font-display text-lg italic text-ink">{title}</h3>
      {hint ? <p className="mt-1 max-w-xs text-sm leading-relaxed text-inkdim">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* --------------------------------- spinner --------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-inkfaint/40 border-t-accent",
        className,
      )}
      aria-label="Loading"
    />
  );
}

/* ------------------------------- icon button ------------------------------- */

export function IconButton({
  label,
  onClick,
  children,
  className,
  active,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 cursor-pointer place-items-center rounded-xl border border-transparent text-inkdim transition-all hover:border-rule hover:bg-card hover:text-ink active:scale-95",
        active && "border-rule bg-card text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- toggle --------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-center gap-2 text-xs font-medium text-inkdim transition-colors hover:text-ink"
    >
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked ? "border-accent bg-accent" : "border-rulestrong bg-card2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3.5 rounded-full bg-card3 shadow-sm transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      {label}
    </button>
  );
}
