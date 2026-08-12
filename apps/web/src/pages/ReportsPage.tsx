import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router";
import { ChartIcon, CheckIcon, InboxIcon, LayersIcon, ListIcon } from "../components/icons";
import { EmptyState, Spinner } from "../components/ui";
import { reportsApi } from "../lib/api";
import { ListIconGlyph } from "../lib/listIcons";

function pct(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export default function ReportsPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["reports"],
    queryFn: reportsApi.summary,
    retry: false,
  });

  const byList = useMemo(() => {
    if (!data) return [];
    const childrenOf = new Map<string, typeof data.byList>();
    const roots: typeof data.byList = [];
    for (const row of data.byList) {
      const key = row.list.parentId ?? "__root__";
      if (key === "__root__") roots.push(row);
      else {
        const arr = childrenOf.get(key) ?? [];
        arr.push(row);
        childrenOf.set(key, arr);
      }
    }
    const out: Array<(typeof data.byList)[number] & { depth: number }> = [];
    const walk = (rows: typeof data.byList, depth: number) => {
      for (const r of rows) {
        out.push({ ...r, depth });
        walk(childrenOf.get(r.list.id) ?? [], depth + 1);
      }
    };
    walk(roots, 0);
    return out;
  }, [data]);

  if (isPending) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={<ChartIcon className="size-6" />}
        title="Report unavailable."
        hint="Could not load your summary right now."
      />
    );
  }

  const { totals } = data;
  const rate = pct(totals.completed, totals.total);

  const stats = [
    { label: "Total tasks", value: totals.total, icon: <LayersIcon className="size-4" /> },
    { label: "Open", value: totals.open, icon: <ChartIcon className="size-4" /> },
    { label: "Completed", value: totals.completed, icon: <CheckIcon className="size-4" /> },
    { label: "In inbox", value: totals.inbox, icon: <InboxIcon className="size-4" /> },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-8 sm:pt-8">
      <header className="anim-fade-up mb-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-accent">Analytics</p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-semibold italic tracking-tight text-ink sm:text-4xl">
            Reports
          </h1>
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-inkfaint tabnum">
            {rate}% done
          </p>
        </div>
        <p className="mt-1 text-sm text-inkdim">Summarized status across all lists.</p>
      </header>

      <div
        className="anim-fade-up grid grid-cols-2 gap-3 sm:grid-cols-4"
        style={{ animationDelay: "0.04s" }}
      >
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-rule bg-card3 p-4 shadow-sm">
            <span className="grid size-8 place-items-center rounded-lg bg-card2 text-inkdim">
              {s.icon}
            </span>
            <p className="mt-3 font-display text-2xl italic tabnum text-ink">{s.value}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkfaint">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <section className="anim-fade-up mt-6" style={{ animationDelay: "0.08s" }}>
        <div className="mb-2 flex items-center gap-2 px-1">
          <h2 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-inkfaint">
            Per list
          </h2>
          <span className="h-px flex-1 bg-rule" />
        </div>

        {byList.length === 0 ? (
          <EmptyState
            icon={<ListIcon className="size-6" />}
            title="No lists yet."
            hint="Create a list and tasks will be summarized here."
          />
        ) : (
          <ul className="stagger space-y-2">
            {byList.map((row) => {
              const done = pct(row.completed, row.total);
              return (
                <li key={row.list.id}>
                  <Link
                    to={`/list/${row.list.id}`}
                    className="group block rounded-2xl border border-rule bg-card3 p-3.5 transition-colors hover:border-rulestrong sm:p-4"
                    style={{ paddingLeft: row.depth > 0 ? 16 + row.depth * 18 : undefined }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-6 shrink-0 place-items-center rounded-lg text-card3"
                        style={{ background: row.list.color }}
                      >
                        {row.list.icon ? (
                          <ListIconGlyph icon={row.list.icon} className="size-3.5" />
                        ) : (
                          <ListIcon className="size-3.5" strokeWidth={2.2} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {row.list.name}
                      </span>
                      <span className="hidden shrink-0 font-mono text-[11px] tabnum text-inkfaint sm:block">
                        {row.open} open · {row.completed} done · {row.total} total
                      </span>
                      <span className="shrink-0 font-mono text-[12px] tabnum text-inkdim">
                        {done}%
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-card2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${done}%`,
                          background:
                            done === 100 ? "var(--ok)" : done > 0 ? "var(--accent)" : "transparent",
                        }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-inkfaint/70">
        get it done · reports
      </p>
    </div>
  );
}
