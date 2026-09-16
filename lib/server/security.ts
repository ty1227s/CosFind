import "server-only";

import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function isSupabaseMode() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SECRET_KEY,
  );
}

export async function getAuthenticatedUser() {
  if (!isSupabaseMode()) return null;
  const token = (await cookies()).get("sb-access-token")?.value;
  if (!token) return null;
  const { data, error } = await createSupabaseAdminClient().auth.getUser(token);
  return error ? null : data.user;
}

export async function isAuthenticatedAdmin() {
  const user = await getAuthenticatedUser();
  if (!user) return false;
  const { data, error } = await createSupabaseAdminClient()
    .from("profiles")
    .select("is_admin,status")
    .eq("id", user.id)
    .maybeSingle();
  return !error && data?.is_admin === true && data.status === "active";
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestUrl = new URL(request.url);
  const expected = forwardedHost
    ? `${forwardedProto || requestUrl.protocol.replace(":", "")}://${forwardedHost}`
    : requestUrl.origin;
  return origin === expected;
}

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

export function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "local";
}

function consumeMemoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  if (rateBuckets.size > 10_000) {
    for (const [bucketKey, bucket] of rateBuckets) if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
  }
  return { allowed: true, retryAfter: 0 };
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  if (isSupabaseMode()) {
    const result = await createSupabaseAdminClient().rpc("consume_api_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    if (!result.error && typeof result.data === "boolean") {
      return { allowed: result.data, retryAfter: result.data ? 0 : Math.ceil(windowMs / 1000) };
    }
  }
  return consumeMemoryRateLimit(key, limit, windowMs);
}
