import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "rn_admin_session";
const DEFAULT_DEV_PASSWORD = "raiznatural2026";

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || DEFAULT_DEV_PASSWORD;
}

export function isUsingDefaultAdminPassword(): boolean {
  return !process.env.ADMIN_PASSWORD?.trim();
}

function getSigningSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    `rn-admin-secret-${getAdminPassword()}`
  );
}

export function createAdminSessionToken(nowMs = Date.now()): string {
  const expiresAt = nowMs + 1000 * 60 * 60 * 24 * 7; // 7 days
  const payload = `admin:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(
  token: string | undefined | null,
  nowMs = Date.now(),
): boolean {
  if (!token) return false;
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex <= 0) return false;

  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (!payload.startsWith("admin:")) return false;

  const expiresAt = Number(payload.slice("admin:".length));
  if (!Number.isFinite(expiresAt) || expiresAt < nowMs) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export function verifyAdminPassword(candidate: string): boolean {
  const expected = getAdminPassword();
  const a = Buffer.from(candidate.trim(), "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}

export { ADMIN_COOKIE_NAME };
