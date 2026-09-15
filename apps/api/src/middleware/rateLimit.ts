import type { Context, MiddlewareHandler } from "hono";

/**
 * Simple in-memory rate limiter middleware for a single-user Worker.
 * Keyed by client IP (from cf-connecting-ip / x-forwarded-for).
 * Resets the counter per `windowMs`.
 *
 * NOTE: Cloudflare Workers keep an isolate alive for minutes, so module-scope
 * state persists across requests within that isolate. For a low-traffic personal
 * app this is adequate. Multi-isolate deployments would need KV-backed limits.
 */

interface RateLimitState {
  count: number;
  resetAt: number;
}

const state = new Map<string, RateLimitState>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

function getClientIP(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function rateLimit(opts: RateLimitOptions): MiddlewareHandler {
  const { windowMs, max } = opts;

  return async (c, next) => {
    const key = getClientIP(c);
    const now = Date.now();
    const existing = state.get(key);

    if (!existing || existing.resetAt < now) {
      state.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    existing.count += 1;
    if (existing.count > max) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests. Please slow down." }, 429);
    }

    await next();
  };
}
