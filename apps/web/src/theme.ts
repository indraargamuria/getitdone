/**
 * Inline-free theme bootstrap.
 * Runs as a module (deferred) so the initial paint already reflects the user's
 * stored preference via localStorage, avoiding a flash. A module script is
 * deferred by default, so this executes after parse but before DOMContentLoaded.
 */
(() => {
  try {
    const stored = localStorage.getItem("gt_theme");
    const dark =
      stored === "dark" ||
      (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch {
    // localStorage unavailable — fall back to system preference only
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  }
})();
