import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
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
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://use.typekit.net",
    "font-src 'self' data: https://use.typekit.net https://p.typekit.net",
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.supabase.co",
    `connect-src 'self' ${supabaseOrigin} ${mapTileOrigin}`.trim(),
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  if (!isLocalDevelopmentHost) cspDirectives.push("upgrade-insecure-requests");
  const csp = cspDirectives.join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    { source: "/((?!api|_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest).*)", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] },
  ],
};
