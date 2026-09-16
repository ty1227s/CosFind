import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { clientAddress, consumeRateLimit, isSameOrigin, isSupabaseMode } from "@/lib/server/security";

function redirect(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url), 303);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  const rate = await consumeRateLimit(`login:${clientAddress(request)}`, 10, 15 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "ログイン試行が多すぎます。時間をおいて再試行してください" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  const form = await request.formData();
  const identifier = String(form.get("identifier") ?? form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!isSupabaseMode()) return redirect(request, "config");
  if ((!/^[a-z0-9_]{3,24}$/.test(identifier) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) || password.length < 1 || password.length > 128) return redirect(request, "invalid");

  const admin = createSupabaseAdminClient();
  let email = identifier.includes("@") ? identifier : "";
  if (!email) {
    const { data: profile } = await admin.from("profiles").select("id").eq("username", identifier).maybeSingle();
    if (!profile) return redirect(request, "invalid");
    const { data: userResult } = await admin.auth.admin.getUserById(profile.id);
    email = userResult.user?.email ?? "";
  }
  if (!email) return redirect(request, "invalid");

  const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.session) return redirect(request, "invalid");
  const profile = await admin.from("profiles").select("is_admin,status").eq("id", data.user.id).maybeSingle();
  if (profile.error || profile.data?.status !== "active") return redirect(request, "invalid");

  const response = NextResponse.redirect(new URL(profile.data.is_admin ? "/admin" : "/", request.url), 303);
  const secure = new URL(request.url).protocol === "https:";
  response.cookies.set("sb-access-token", data.session.access_token, { httpOnly: true, sameSite: "lax", secure, maxAge: data.session.expires_in, path: "/" });
  response.cookies.set("sb-refresh-token", data.session.refresh_token, { httpOnly: true, sameSite: "lax", secure, maxAge: 2592000, path: "/" });
  return response;
}
