import { useMutation, useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router";
import { StampIcon } from "../components/icons";
import { MobileHeader } from "../components/MobileHeader";
import { SearchOverlay } from "../components/SearchOverlay";
import { Sidebar } from "../components/Sidebar";
import { TaskDetail } from "../components/TaskDetail";
import { Spinner } from "../components/ui";
import { useTheme } from "../hooks/useTheme";
import { authApi, bootstrapApi, tasksApi } from "../lib/api";
import { queryClient } from "../lib/query";

const TaskContext = createContext<{ openTask: (id: string) => void }>({ openTask: () => {} });
export const useTaskContext = () => useContext(TaskContext);

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { mode, setTheme } = useTheme();

  const bootstrap = useQuery({ queryKey: ["bootstrap"], queryFn: bootstrapApi, retry: false });

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  const selected = useQuery({
    queryKey: ["task", selectedId],
    queryFn: () => tasksApi.get(selectedId!),
    enabled: !!selectedId,
    retry: false,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
      if (typing) return;
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (bootstrap.isPending) return <Splash />;
  if (bootstrap.error) return <Navigate to="/login" replace />;

  const data = bootstrap.data!;
  const { user } = data;

  return (
    <TaskContext.Provider value={{ openTask: setSelectedId }}>
      <div className="paper-grain min-h-dvh">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-rule bg-paper/70 backdrop-blur-xl md:block">
          <Sidebar
            data={data}
            user={user}
            onLogout={() => logout.mutate()}
            theme={mode}
            setTheme={setTheme}
          />
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="anim-fade-in absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="anim-drawer absolute inset-y-0 left-0 w-[300px] border-r border-rule bg-paper shadow-lift">
              <Sidebar
                data={data}
                user={user}
                onLogout={() => logout.mutate()}
                onNavigate={() => setMobileOpen(false)}
                theme={mode}
                setTheme={setTheme}
              />
            </aside>
          </div>
        ) : null}

        <MobileHeader onMenu={() => setMobileOpen(true)} onSearch={() => setSearchOpen(true)} />

        <main className="pb-16 md:pb-10 md:pl-[264px]">
          <Outlet />
        </main>

        <SearchOverlay
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onOpenTask={setSelectedId}
        />

        {selectedId && selected.data ? (
          <TaskDetail
            key={selectedId}
            task={selected.data.task}
            lists={data.lists}
            tags={data.tags}
            assignees={data.assignees}
            onClose={() => setSelectedId(null)}
            onChanged={() => bootstrap.refetch()}
          />
        ) : null}
      </div>
    </TaskContext.Provider>
  );
}

function Splash() {
  return (
    <div className="paper-grain grid min-h-dvh place-items-center">
      <div className="anim-fade-in flex flex-col items-center gap-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent text-card3 shadow-lift">
          <StampIcon className="size-7" strokeWidth={2} />
        </span>
        <div className="flex items-center gap-2 text-sm text-inkdim">
          <Spinner /> Opening your day…
        </div>
      </div>
    </div>
  );
}
