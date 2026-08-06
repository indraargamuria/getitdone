import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { SparkIcon, StampIcon } from "../components/icons";
import { useToast } from "../components/ui";
import { authApi } from "../lib/api";
import { cn } from "../lib/cn";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () =>
      mode === "login"
        ? authApi.login({ email, password })
        : authApi.signup({ email, password, displayName: displayName || undefined }),
    onSuccess: () => {
      queryClient.clear();
      navigate("/today", { replace: true });
    },
    onError: (e) =>
      toast("error", mode === "login" ? "Sign in failed" : "Sign up failed", (e as Error).message),
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="paper-grain relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <span className="pointer-events-none absolute -right-8 top-6 select-none font-display text-[34vh] italic leading-none text-ink/[0.04] dark:text-ink/[0.05]">
        0<span className="text-accent/40">1</span>
      </span>

      <div className="anim-fade-up relative w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3 px-1">
          <span className="grid size-11 place-items-center rounded-2xl bg-accent text-card3 shadow-lift">
            <StampIcon className="size-6" strokeWidth={2} />
          </span>
          <div className="leading-tight">
            <h1 className="font-display text-2xl italic font-semibold tracking-tight text-ink">
              Get It <span className="text-accent">Done</span>
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-inkfaint">
              {today}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-rule bg-card/80 p-6 shadow-lift backdrop-blur-sm">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-card2 p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "cursor-pointer rounded-lg py-1.5 text-sm transition-colors",
                  mode === m
                    ? "bg-card3 font-semibold text-ink shadow-sm"
                    : "text-inkfaint hover:text-ink",
                )}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim() && password) mutation.mutate();
            }}
          >
            {mode === "signup" ? (
              <Field label="Name" htmlFor="name">
                <input
                  id="name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="auth-input"
                />
              </Field>
            ) : null}
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="auth-input"
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                className="auth-input"
              />
            </Field>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-card3 shadow-lift transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
            >
              {mutation.isPending ? (
                <span className="size-4 animate-spin rounded-full border-2 border-card3/40 border-t-card3" />
              ) : (
                <SparkIcon className="size-4" />
              )}
              {mode === "login" ? "Sign in" : "Create my workspace"}
            </button>
          </form>

          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-inkfaint">
            one user · one workspace · edge-deployed
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-inkfaint">
        {label}
      </span>
      {children}
    </label>
  );
}
