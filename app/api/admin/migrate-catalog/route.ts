import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAuthenticatedAdmin, isSameOrigin } from "@/lib/server/security";

type Brand = { name: string; nameKana?: string };
type Chain = { name: string; storeType: string };
type Product = { brand: string; name: string; category: string; janCode?: string; variants?: { name: string; colorCode?: string; janCode?: string }[] };
type Store = { name: string; chain?: string; type: string; address: string; latitude: number; longitude: number };

async function requireAdmin() {
  return isAuthenticatedAdmin();
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  try {
    const db = createSupabaseAdminClient();
    const [brandsResult, chainsResult, productsResult, storesResult] = await Promise.all([
      db.from("brands").select("id,name,name_kana").order("name"),
      db.from("store_chains").select("id,name,store_type").eq("is_active", true).order("name"),
      db.from("products").select("id,name,category,jan_code,brands(name),product_variants(id,variant_name,color_code,jan_code)").eq("is_active", true).order("name"),
      db.from("stores").select("id,name,chain_name,store_type,address,latitude,longitude").eq("is_active", true).order("name"),
    ]);
    const error = brandsResult.error || chainsResult.error || productsResult.error || storesResult.error;
    if (error) throw error;
    type ProductRow = { id: string; name: string; category: string; jan_code: string | null; brands: { name: string } | { name: string }[] | null; product_variants: { id: string; variant_name: string; color_code: string | null; jan_code: string | null }[] };
    const productRows = (productsResult.data ?? []) as unknown as ProductRow[];
    return NextResponse.json({
      ok: true,
      brands: (brandsResult.data ?? []).map((row) => ({ id: row.id, name: row.name, nameKana: row.name_kana ?? "" })),
      chains: (chainsResult.data ?? []).map((row) => ({ id: row.id, name: row.name, storeType: row.store_type })),
      products: productRows.map((row) => ({ id: row.id, brand: Array.isArray(row.brands) ? row.brands[0]?.name ?? "" : row.brands?.name ?? "", name: row.name, category: row.category, janCode: row.jan_code ?? "", variants: row.product_variants.map((variant) => ({ id: variant.id, name: variant.variant_name, colorCode: variant.color_code ?? "", janCode: variant.jan_code ?? "" })) })),
      stores: (storesResult.data ?? []).map((row) => ({ id: row.id, name: row.name, chain: row.chain_name ?? "", type: row.store_type, address: row.address, latitude: row.latitude, longitude: row.longitude })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Supabaseからの読み込みに失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  if (!(await requireAdmin())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  try {
    const body = await request.json() as { brands?: Brand[]; chains?: Chain[]; products?: Product[]; stores?: Store[] };
    const brands = (body.brands ?? []).slice(0, 5000); const chains = (body.chains ?? []).slice(0, 5000); const products = (body.products ?? []).slice(0, 20000); const stores = (body.stores ?? []).slice(0, 20000);
    const db = createSupabaseAdminClient();
    const brandIds = new Map<string, string>(); const chainIds = new Map<string, string>();
    for (const brand of [...brands, ...products.map((product) => ({ name: product.brand }))]) {
      if (!brand.name?.trim() || brandIds.has(brand.name)) continue;
      const { data, error } = await db.from("brands").upsert({ name: brand.name.trim(), name_kana: "nameKana" in brand ? brand.nameKana || null : null }, { onConflict: "name" }).select("id").single();
      if (error) throw error; brandIds.set(brand.name, data.id);
    }
    for (const chain of chains) {
      if (!chain.name?.trim()) continue;
      const { data, error } = await db.from("store_chains").upsert({ name: chain.name.trim(), store_type: chain.storeType, is_active: true }, { onConflict: "name" }).select("id").single();
      if (error) throw error; chainIds.set(chain.name, data.id);
    }
    let variantCount = 0;
    for (const product of products) {
      const brandId = brandIds.get(product.brand); if (!brandId || !product.name?.trim()) continue;
      const { data, error } = await db.from("products").upsert({ brand_id: brandId, name: product.name.trim(), category: product.category, jan_code: product.janCode || null, is_active: true }, { onConflict: "brand_id,name" }).select("id").single();
      if (error) throw error;
      for (const variant of product.variants ?? []) { if (!variant.name?.trim()) continue; const { error: variantError } = await db.from("product_variants").upsert({ product_id: data.id, variant_name: variant.name.trim(), color_code: variant.colorCode || null, jan_code: variant.janCode || null }, { onConflict: "product_id,variant_name" }); if (variantError) throw variantError; variantCount += 1; }
    }
    for (const store of stores) {
      if (!store.name?.trim() || !store.address?.trim()) continue;
      const row = { name: store.name.trim(), chain_id: store.chain ? chainIds.get(store.chain) ?? null : null, chain_name: store.chain || null, store_type: store.type, address: store.address.trim(), latitude: store.latitude, longitude: store.longitude, is_active: true };
      const { data: existing, error: findError } = await db.from("stores").select("id").eq("name", row.name).eq("address", row.address).maybeSingle(); if (findError) throw findError;
      const result = existing ? await db.from("stores").update(row).eq("id", existing.id) : await db.from("stores").insert(row); if (result.error) throw result.error;
    }
    return NextResponse.json({ ok: true, brands: brandIds.size, chains: chainIds.size, products: products.length, variants: variantCount, stores: stores.length });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "移行に失敗しました" }, { status: 500 }); }
}
