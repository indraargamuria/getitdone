import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
const KEY = "gt_theme";

function systemIsDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(KEY) as ThemeMode | null;
    return saved && ["light", "dark", "system"].includes(saved) ? saved : "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const apply = (isDark: boolean) => root.classList.toggle("dark", isDark);

    if (mode === "system") {
      const onChange = () => apply(systemIsDark());
      onChange();
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    apply(mode === "dark");
  }, [mode]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isDark ? "#14110b" : "#f2ede3");
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    localStorage.setItem(KEY, next);
    setMode(next);
  }, []);

  return { mode, setTheme, isDark: mode === "dark" || (mode === "system" && systemIsDark()) };
}
