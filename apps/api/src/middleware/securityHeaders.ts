import type { MiddlewareHandler } from "hono";

/**
 * Security headers middleware.
 * Adds hardening headers to every API response.
 * HSTS uses a short max-age for safe rollout; increase to 31536000 once confirmed.
 */
export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    // Prevent MIME type sniffing
    c.header("X-Content-Type-Options", "nosniff");

    // Clickjacking protection — API responses should never be framed
    c.header("X-Frame-Options", "DENY");

    // Referrer policy — limit leakage to third parties
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions policy — disable features the API doesn't need
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

    // HSTS — 7 days initially; increase to 31536000 once confirmed working
    c.header("Strict-Transport-Security", "max-age=604800; includeSubDomains");

    // Content Security Policy for an API:
    // - default-src 'none' since this is not a document
    // - frame-ancestors 'none' same intent as X-Frame-Options
    c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");

    // Cross-Origin-Opener-Policy / Resource-Policy
    c.header("Cross-Origin-Opener-Policy", "same-origin");
    c.header("Cross-Origin-Resource-Policy", "same-origin");

    // Keep API responses out of browsers' back-forward cache when a session
    // may have been invalidated client-side.
    c.header("Cache-Control", "no-store");
  };
}
