import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { clientAddress, consumeRateLimit, isSameOrigin, isSupabaseMode } from "@/lib/server/security";
import { isStrongPassword } from "@/lib/password-policy";

function redirect(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/login?mode=signup&error=${encodeURIComponent(error)}`, request.url), 303);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  const rate = await consumeRateLimit(`signup:${clientAddress(request)}`, 5, 60 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "登録試行が多すぎます。時間をおいて再試行してください" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("passwordConfirmation") ?? "");
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return redirect(request, "username");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return redirect(request, "email");
  if (!isStrongPassword(password)) return redirect(request, "password_complexity");
  if (password !== confirmation) return redirect(request, "password_match");
  if (!isSupabaseMode()) return redirect(request, "config");

  const admin = createSupabaseAdminClient();
  const existing = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (existing.error) return redirect(request, "server");
  if (existing.data) return redirect(request, "username_taken");
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username, display_name: username, avatar: "✨" } });
  if (created.error) return redirect(request, created.error.message.toLowerCase().includes("registered") ? "email_taken" : "create");
  if (!created.data.user) return redirect(request, "create");
  const profile = await admin.from("profiles").update({ username }).eq("id", created.data.user.id).select("id").maybeSingle();
  if (profile.error || !profile.data) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return redirect(request, profile.error?.code === "23505" ? "username_taken" : "profile");
  }
  const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const signedIn = await auth.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) return NextResponse.redirect(new URL("/login?registered=ready", request.url), 303);
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  const secure = new URL(request.url).protocol === "https:";
  response.cookies.set("sb-access-token", signedIn.data.session.access_token, { httpOnly: true, sameSite: "lax", secure, maxAge: signedIn.data.session.expires_in, path: "/" });
  response.cookies.set("sb-refresh-token", signedIn.data.session.refresh_token, { httpOnly: true, sameSite: "lax", secure, maxAge: 2592000, path: "/" });
  return response;
}
