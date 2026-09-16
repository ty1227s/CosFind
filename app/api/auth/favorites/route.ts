import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/server/security";
import { operatingPeriodQuery } from "@/lib/store-operating-period";

export const dynamic = "force-dynamic";
type Kind = "product" | "store";
const metadataKey = (kind: Kind) => kind === "product" ? "favorite_product_ids" : "favorite_store_ids";
const FAVORITE_LIMITS: Record<Kind, number> = { product: 100, store: 10 };
const idsFrom = (value: unknown) => Array.isArray(value) ? value.filter((id): id is string => typeof id === "string").slice(0, 200) : [];

async function currentUser() { const token = (await cookies()).get("sb-access-token")?.value; if (!token) return null; const db = createSupabaseAdminClient(); const { data, error } = await db.auth.getUser(token); return error ? null : data.user; }

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const productIds = idsFrom(user.user_metadata?.favorite_product_ids); const storeIds = idsFrom(user.user_metadata?.favorite_store_ids); const db = createSupabaseAdminClient();
  const [productsResult, storesResult] = await Promise.all([
    productIds.length ? db.from("products").select("id,name,brands(name)").in("id", productIds).eq("is_active", true) : Promise.resolve({ data: [], error: null }),
    storeIds.length ? operatingPeriodQuery(db.from("stores").select("id,name,chain_name,address").in("id", storeIds).eq("is_active", true)) : Promise.resolve({ data: [], error: null }),
  ]);
  const metadataResult = storeIds.length ? await db.from("store_requests").select("payload,created_at").eq("status", "metadata").order("created_at", { ascending: true }) : { data: [], error: null };
  const error = productsResult.error || storesResult.error || metadataResult.error; if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  type ProductRow = { id: string; name: string; brands: { name: string } | { name: string }[] | null };
  const products = ((productsResult.data ?? []) as unknown as ProductRow[]).map((row) => ({ id: row.id, name: row.name, brand: Array.isArray(row.brands) ? row.brands[0]?.name ?? "" : row.brands?.name ?? "" }));
  const customNames = new Map<string, boolean>();
  for (const row of metadataResult.data ?? []) { const payload=row.payload as {storeId?:unknown;customName?:unknown};if(typeof payload.storeId==="string"&&typeof payload.customName==="boolean")customNames.set(payload.storeId,payload.customName); }
  const stores = (storesResult.data ?? []).map((row) => ({ id: row.id, name: row.name, chain: row.chain_name ?? "", customName:customNames.get(row.id)===true, address: row.address }));
  return NextResponse.json({ productIds, storeIds, products, stores }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const body = await request.json() as { kind?: Kind; id?: string }; if ((body.kind !== "product" && body.kind !== "store") || !body.id) return NextResponse.json({ error: "お気に入り対象が不正です" }, { status: 400 });
  const key = metadataKey(body.kind); const current = idsFrom(user.user_metadata?.[key]); const favorite = !current.includes(body.id);
  if(favorite){const db=createSupabaseAdminClient();const target=body.kind==="store"?await operatingPeriodQuery(db.from("stores").select("id").eq("id",body.id).eq("is_active",true)).maybeSingle():await db.from("products").select("id").eq("id",body.id).eq("is_active",true).maybeSingle();if(target.error||!target.data)return NextResponse.json({error:"お気に入り対象が見つかりません"},{status:404});}
  if (favorite && current.length >= FAVORITE_LIMITS[body.kind]) return NextResponse.json({ error: body.kind === "product" ? "お気に入り商品は100件まで登録できます" : "お気に入り店舗は10件まで登録できます", limit: FAVORITE_LIMITS[body.kind] }, { status: 409 });
  const next = favorite ? [body.id, ...current] : current.filter((id) => id !== body.id);
  const db = createSupabaseAdminClient(); const { error } = await db.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, [key]: next } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ ok: true, favorite });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const body = await request.json() as { productIds?: string[]; storeIds?: string[] }; const removingProducts = new Set(idsFrom(body.productIds)); const removingStores = new Set(idsFrom(body.storeIds));
  if (!removingProducts.size && !removingStores.size) return NextResponse.json({ error: "削除対象を選択してください" }, { status: 400 });
  const productIds = idsFrom(user.user_metadata?.favorite_product_ids).filter((id) => !removingProducts.has(id)); const storeIds = idsFrom(user.user_metadata?.favorite_store_ids).filter((id) => !removingStores.has(id));
  const db = createSupabaseAdminClient(); const { error } = await db.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, favorite_product_ids: productIds, favorite_store_ids: storeIds } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ ok: true, removed: removingProducts.size + removingStores.size });
}
