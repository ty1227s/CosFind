import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { clientAddress, consumeRateLimit, isSameOrigin } from "@/lib/server/security";

const AUTH_COOKIES = ["sb-access-token", "sb-refresh-token"];

function clearAuthCookies(response: NextResponse, request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  for (const name of AUTH_COOKIES) response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", secure, maxAge: 0, path: "/" });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  const token = (await cookies()).get("sb-access-token")?.value;
  if (!token) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const db = createSupabaseAdminClient();
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "ログイン情報を確認できませんでした" }, { status: 401 });
  const rate = await consumeRateLimit(`delete-account:${auth.user.id}:${clientAddress(request)}`, 5, 60 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "確認回数が多すぎます。時間をおいて再試行してください" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json().catch(() => ({})) as { password?: string };
  if (!body.password || !auth.user.email) return NextResponse.json({ error: "パスワードを入力してください" }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return NextResponse.json({ error: "認証設定を確認できませんでした" }, { status: 500 });
  const verifier = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const verified = await verifier.auth.signInWithPassword({ email: auth.user.email, password: body.password });
  if (verified.error || !verified.data.user || verified.data.user.id !== auth.user.id) return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 400 });

  const reports = await db.from("stock_reports").select("id").eq("user_id", auth.user.id);
  if (reports.error) return NextResponse.json({ error: reports.error.message }, { status: 500 });
  const reportIds = (reports.data ?? []).map((report) => report.id);
  if (reportIds.length) {
    const referencedAbuse = await db.from("abuse_reports").delete().in("stock_report_id", reportIds);
    if (referencedAbuse.error) return NextResponse.json({ error: referencedAbuse.error.message }, { status: 500 });
  }
  for (const [table, column] of [["abuse_reports", "reporter_id"], ["stock_reports", "user_id"], ["product_requests", "user_id"], ["store_requests", "user_id"]] as const) {
    const removed = await db.from(table).delete().eq(column, auth.user.id);
    if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 500 });
  }
  const avatarFiles = await db.storage.from("avatars").list(auth.user.id);
  if (!avatarFiles.error && avatarFiles.data.length) await db.storage.from("avatars").remove(avatarFiles.data.map((file) => `${auth.user.id}/${file.name}`));
  const deleted = await db.auth.admin.deleteUser(auth.user.id);
  if (deleted.error) return NextResponse.json({ error: deleted.error.message }, { status: 500 });
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response, request);
  return response;
}
