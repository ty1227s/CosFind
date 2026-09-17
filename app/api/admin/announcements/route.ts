import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAuthenticatedAdmin, isSameOrigin } from "@/lib/server/security";
import { text, UUID_PATTERN } from "@/lib/server/validation";
import { postAnnouncementToX } from "@/lib/server/x";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticatedAdmin())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  const result = await createSupabaseAdminClient().from("announcements").select("id,title,body,published_at,created_at,updated_at").order("published_at", { ascending: false });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return NextResponse.json({ announcements: (result.data ?? []).map((row) => ({ id: row.id, title: row.title, body: row.body, publishedAt: row.published_at, createdAt: row.created_at, updatedAt: row.updated_at })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  if (!(await isAuthenticatedAdmin())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { id?: unknown; title?: unknown; body?: unknown } | null;
  const title = text(payload?.title, 120, true); const body = text(payload?.body, 20_000, true);
  if (title === null || body === null) return NextResponse.json({ error: "タイトルは120文字以内、本文は20,000文字以内で入力してください" }, { status: 400 });
  const db = createSupabaseAdminClient(); const columns = "id,title,body,published_at,created_at,updated_at";
  const isUpdate = typeof payload?.id === "string" && UUID_PATTERN.test(payload.id);
  const result = isUpdate
    ? await db.from("announcements").update({ title, body, updated_at: new Date().toISOString() }).eq("id", payload.id).select(columns).maybeSingle()
    : await db.from("announcements").insert({ title, body, is_published: true }).select(columns).single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "お知らせが見つかりません" }, { status: 404 });
  const row=result.data;
  let xPosted: boolean | undefined;
  let warning: string | undefined;
  if (!isUpdate) {
    const announcementUrl = `${new URL(request.url).origin}/announcements/${row.id}`;
    const xResult = await postAnnouncementToX(title, body, announcementUrl);
    xPosted = xResult.ok;
    if (!xResult.ok) {
      warning = {
        not_configured: "お知らせは公開しましたが、X連携用のSecretが未設定のためXには投稿していません。",
        billing_required: "お知らせは公開しましたが、X APIの利用クレジットが不足しているためXには投稿できませんでした。X Developer Consoleでクレジットを確認してください。",
        unauthorized: "お知らせは公開しましたが、X連携の認証情報が無効なためXには投稿できませんでした。",
        forbidden: "お知らせは公開しましたが、Xアプリに投稿権限がないためXには投稿できませんでした。",
        rate_limited: "お知らせは公開しましたが、X APIの利用上限に達しているためXには投稿できませんでした。時間を置いて再度お試しください。",
        request_failed: "お知らせは公開しましたが、Xへの同時投稿に失敗しました。",
      }[xResult.reason];
    }
  }
  return NextResponse.json({ ok: true, xPosted, warning, announcement: { id: row.id, title: row.title, body: row.body, publishedAt: row.published_at, createdAt: row.created_at, updatedAt: row.updated_at } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  if (!(await isAuthenticatedAdmin())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { id?: unknown } | null;
  if (typeof payload?.id !== "string" || !UUID_PATTERN.test(payload.id)) return NextResponse.json({ error: "削除対象が不正です" }, { status: 400 });
  const result = await createSupabaseAdminClient().from("announcements").delete().eq("id", payload.id).select("id").maybeSingle();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "お知らせが見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
