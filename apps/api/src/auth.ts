import { newId } from "@getitdone/shared";
import type { Context } from "hono";
import type { AppEnv } from "./types";

type CookieContext = Context<AppEnv>;

const ITERATIONS = 100_000;
const KEY_LEN = 32;

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomHex(16);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: ITERATIONS, hash: "SHA-256" },
    key,
    KEY_LEN * 8,
  );
  return `pbkdf2_sha256$${ITERATIONS}$${salt}$${toHex(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterStr, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2_sha256" || !salt || !hash) return false;
  const iterations = Number.parseInt(iterStr ?? "", 10) || ITERATIONS;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations, hash: "SHA-256" },
    key,
    KEY_LEN * 8,
  );
  return timingSafeEqual(toHex(bits), hash);
}

export const SESSION_COOKIE = "gt_session";
const SESSION_DAYS = 30;

export function isSecure(c: CookieContext): boolean {
  const appEnv = c.env.APP_ENV ?? "development";
  return appEnv !== "development";
}

export function setSessionCookie(c: CookieContext, token: string): void {
  const secure = isSecure(c);
  c.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=${secure ? "None" : "Lax"}${
      secure ? "; Secure" : ""
    }; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  );
}

export function clearSessionCookie(c: CookieContext): void {
  const secure = isSecure(c);
  c.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=${secure ? "None" : "Lax"}${
      secure ? "; Secure" : ""
    }; Max-Age=0`,
  );
}

export function getSessionToken(c: CookieContext): string | null {
  const cookie = c.req.header("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=");
  }
  return null;
}

export function sessionExpiry(now = new Date()): string {
  return new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function newSessionId(): string {
  return newId();
}
