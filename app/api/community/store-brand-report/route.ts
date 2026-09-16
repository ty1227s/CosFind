import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getUserPoints } from "@/lib/server/current-user";
import { clientAddress, consumeRateLimit, isSameOrigin } from "@/lib/server/security";

const METHODS = new Set(["store_visit", "staff_confirmation", "phone", "official_information"]);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "報告にはログインが必要です" }, { status: 401 });
  const rate = await consumeRateLimit(`brand-report:${user.id}:${clientAddress(request)}`, 60, 60 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "報告回数が多すぎます。時間をおいて再試行してください" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json().catch(() => null) as { storeId?: string; brandId?: string; method?: string } | null;
  if (!body?.storeId || !body.brandId || !body.method || !METHODS.has(body.method)) return NextResponse.json({ error: "店舗・ブランド・確認方法を選択してください" }, { status: 400 });
  const db = createSupabaseAdminClient();
  const [profile, store, brand] = await Promise.all([
    db.from("profiles").select("status,posting_suspended").eq("id", user.id).maybeSingle(),
    db.from("stores").select("id").eq("id", body.storeId).eq("is_active", true).maybeSingle(),
    db.from("brands").select("id,name").eq("id", body.brandId).maybeSingle(),
  ]);
  if (profile.error || profile.data?.status !== "active" || profile.data.posting_suspended) return NextResponse.json({ error: "現在このアカウントから投稿できません" }, { status: 403 });
  if (store.error || !store.data || brand.error || !brand.data) return NextResponse.json({ error: "店舗またはブランドを確認できませんでした" }, { status: 400 });
  const saved = await db.from("store_requests").insert({ user_id: user.id, status: "metadata", payload: { metadataType: "store_brand_report", storeId: body.storeId, brandId: body.brandId, confirmationMethod: body.method, reportedAt: new Date().toISOString() } });
  if (saved.error) return NextResponse.json({ error: "報告を保存できませんでした" }, { status: 500 });
  return NextResponse.json({ ok: true, awarded: 3, ...await getUserPoints(user.id) });
}
