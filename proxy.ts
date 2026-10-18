import { NextRequest, NextResponse } from "next/server";
import { createClient, type Session } from "@supabase/supabase-js";

const ACCESS_COOKIE = "sb-access-token";
const REFRESH_COOKIE = "sb-refresh-token";
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
const REFRESH_BEFORE_EXPIRY_SECONDS = 60;

function tokenExpiresAt(token: string | undefined) {
  if (!token) return 0;
  try {
    const payload = token.split(".")[1];
    if (!payload) return 0;
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const value = JSON.parse(atob(normalized)) as { exp?: unknown };
    return typeof value.exp === "number" ? value.exp : 0;
  } catch {
    return 0;
  }
}

async function refreshSessionIfNeeded(request: NextRequest): Promise<Session | null> {
  if (["/api/auth/login", "/api/auth/logout", "/api/auth/signup", "/api/admin/logout"].includes(request.nextUrl.pathname)) return null;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const expiresAt = tokenExpiresAt(accessToken);
  if (expiresAt > Math.floor(Date.now() / 1000) + REFRESH_BEFORE_EXPIRY_SECONDS) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) return null;
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return null;

  request.cookies.set(ACCESS_COOKIE, data.session.access_token);
  request.cookies.set(REFRESH_COOKIE, data.session.refresh_token);
  return data.session;
}

export async function proxy(request: NextRequest) {
  const refreshedSession = await refreshSessionIfNeeded(request);
  const nonce = btoa(crypto.randomUUID());
  const hostname = request.nextUrl.hostname;
  const isLocalDevelopmentHost = hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "10.0.2.2";
  const supabaseOrigin = (() => {
    try { return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ""; }
    catch { return ""; }
  })();
  const mapTileOrigin = (() => {
    try { return new URL(process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png").origin; }
    catch { return "https://tile.openstreetmap.org"; }
  })();
  const cspDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://use.typekit.net https://pagead2.googlesyndication.com`,
    "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
    "font-src 'self' data: https://use.typekit.net https://p.typekit.net",
    "img-src 'self' data: blob: https://use.typekit.net https://p.typekit.net https://tile.openstreetmap.org https://*.supabase.co https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.google.com https://*.gstatic.com",
    `connect-src 'self' https://use.typekit.net https://p.typekit.net ${supabaseOrigin} ${mapTileOrigin} https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.google.com`.trim(),
    "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  if (!isLocalDevelopmentHost) cspDirectives.push("upgrade-insecure-requests");
  const csp = cspDirectives.join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (refreshedSession) {
    const secure = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
    response.cookies.set(ACCESS_COOKIE, refreshedSession.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: refreshedSession.expires_in,
      path: "/",
    });
    response.cookies.set(REFRESH_COOKIE, refreshedSession.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: REFRESH_COOKIE_MAX_AGE,
      path: "/",
    });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest).*)",
  ],
};
