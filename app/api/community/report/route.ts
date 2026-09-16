import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getUserPoints } from "@/lib/server/current-user";
import { clientAddress, consumeRateLimit, isSameOrigin } from "@/lib/server/security";
import { text } from "@/lib/server/validation";
import { operatingPeriodQuery } from "@/lib/store-operating-period";

const METHODS = new Set(["store_visit", "staff_confirmation", "phone", "official_information"]);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "投稿にはログインが必要です" }, { status: 401 });
  const rate = await consumeRateLimit(`report:${user.id}:${clientAddress(request)}`, 60, 60 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "投稿回数が多すぎます。時間をおいて再試行してください" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json().catch(() => null) as { productId?: string; variantId?: string; storeId?: string; method?: string; comment?: string } | null;
  if (!body?.productId || !body.storeId || !body.method || !METHODS.has(body.method)) return NextResponse.json({ error: "商品・店舗・確認方法を選択してください" }, { status: 400 });
  const comment = text(body.comment, 200);
  if (comment === null) return NextResponse.json({ error: "コメントは200文字以内で入力してください" }, { status: 400 });

  const db = createSupabaseAdminClient();
  const [profile, product, store, variant] = await Promise.all([
    db.from("profiles").select("status,posting_suspended").eq("id", user.id).maybeSingle(),
    db.from("products").select("id").eq("id", body.productId).eq("is_active", true).maybeSingle(),
    operatingPeriodQuery(db.from("stores").select("id").eq("id", body.storeId).eq("is_active", true)).maybeSingle(),
    body.variantId ? db.from("product_variants").select("id").eq("id", body.variantId).eq("product_id", body.productId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (profile.error || profile.data?.status !== "active" || profile.data.posting_suspended) return NextResponse.json({ error: "現在このアカウントから投稿できません" }, { status: 403 });
  if (product.error || !product.data || store.error || !store.data || variant.error || (body.variantId && !variant.data)) return NextResponse.json({ error: "商品・カラー・店舗の組み合わせを確認できませんでした" }, { status: 400 });
  const saved = await db.from("stock_reports").insert({ product_id: body.productId, product_variant_id: body.variantId || null, store_id: body.storeId, user_id: user.id, status: "available", confirmation_method: body.method, comment: comment || null });
  if (saved.error) return NextResponse.json({ error: "在庫報告を保存できませんでした" }, { status: 500 });
  return NextResponse.json({ ok: true, awarded: 1, ...await getUserPoints(user.id) });
}
