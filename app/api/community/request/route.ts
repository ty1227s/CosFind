import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getUserPoints } from "@/lib/server/current-user";
import { clientAddress, consumeRateLimit, isSameOrigin } from "@/lib/server/security";
import { finiteCoordinate, optionalJan, text } from "@/lib/server/validation";
import { PRODUCT_CATEGORY_GROUPS } from "@/lib/product-categories";
import { STORE_TYPES } from "@/lib/store-types";

const PRODUCT_CATEGORIES = new Set<string>(PRODUCT_CATEGORY_GROUPS.flatMap((group) => group.categories));
const STORE_TYPE_SET = new Set<string>(STORE_TYPES);

function sanitizeProduct(payload: Record<string, unknown>) {
  const brand = text(payload.brand, 100);
  const name = text(payload.name, 150);
  const category = text(payload.category, 50);
  const janCode = optionalJan(payload.janCode);
  const variantName = text(payload.variantName, 100);
  const colorCode = text(payload.colorCode, 40);
  const variantJanCode = optionalJan(payload.variantJanCode);
  const pa = typeof payload.pa === "string" && ["", "+", "++", "+++", "++++"].includes(payload.pa) ? payload.pa : null;
  if (!brand || !name || !category || !PRODUCT_CATEGORIES.has(category) || janCode === null || !variantName || colorCode === null || variantJanCode === null || pa === null) return null;
  return { brand, name, category, janCode, variantName, colorCode, variantJanCode, pa };
}

function sanitizeStore(payload: Record<string, unknown>) {
  const name = text(payload.name, 150);
  const chain = text(payload.chain, 100);
  const type = text(payload.type, 50);
  const address = text(payload.address, 250);
  const latitude = finiteCoordinate(payload.latitude, -90, 90);
  const longitude = finiteCoordinate(payload.longitude, -180, 180);
  if (!name || chain === null || !type || !STORE_TYPE_SET.has(type) || address === null || latitude === null || longitude === null) return null;
  return { name, chain, type, address, latitude, longitude };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "申請にはログインが必要です" }, { status: 401 });
  const rate = await consumeRateLimit(`request:${user.id}:${clientAddress(request)}`, 20, 60 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "申請回数が多すぎます。時間をおいて再試行してください" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 25_000) return NextResponse.json({ error: "申請データが大きすぎます" }, { status: 413 });
  const body = await request.json().catch(() => null) as { kind?: "product" | "store"; payload?: unknown } | null;
  if (!body || !body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) return NextResponse.json({ error: "申請内容が不正です" }, { status: 400 });

  const db = createSupabaseAdminClient();
  const profile = await db.from("profiles").select("status,posting_suspended").eq("id", user.id).maybeSingle();
  if (profile.error || profile.data?.status !== "active" || profile.data.posting_suspended) return NextResponse.json({ error: "現在このアカウントから申請できません" }, { status: 403 });
  const payload = body.kind === "product" ? sanitizeProduct(body.payload as Record<string, unknown>) : body.kind === "store" ? sanitizeStore(body.payload as Record<string, unknown>) : null;
  if (!payload) return NextResponse.json({ error: "申請内容を確認してください" }, { status: 400 });
  const table = body.kind === "product" ? "product_requests" : "store_requests";
  const saved = await db.from(table).insert({ user_id: user.id, payload, status: "pending" });
  if (saved.error) return NextResponse.json({ error: "申請を保存できませんでした" }, { status: 500 });
  return NextResponse.json({ ok: true, awarded: 3, ...await getUserPoints(user.id) });
}
