import "server-only";
import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RelatedBrand = { id: string; name: string };
type ProductSeoRow = {
  id: string;
  name: string;
  category: string;
  additional_categories: string[] | null;
  jan_code: string | null;
  additional_jan_codes: string[] | null;
  release_date: string | null;
  brands: RelatedBrand | RelatedBrand[] | null;
  product_variants: { variant_name: string; color_code: string | null; jan_code: string | null }[];
};
type BrandSeoRow = { id: string; name: string; name_kana: string | null };
type BrandProductRow = { id: string; name: string; category: string; additional_categories: string[] | null };
type SitemapPage = { products: { id: string }[]; brands: string[] };

export const getProductSeoData = cache(async (id: string) => {
  const db = createSupabaseAdminClient();
  const result = await db
    .from("products")
    .select("id,name,category,additional_categories,jan_code,additional_jan_codes,release_date,brands(id,name),product_variants(variant_name,color_code,jan_code)")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (result.error) throw new Error(`商品SEO情報の取得に失敗しました: ${result.error.message}`);
  if (!result.data) return null;
  const product = result.data as unknown as ProductSeoRow;
  return { ...product, brand: Array.isArray(product.brands) ? product.brands[0] ?? null : product.brands };
});

export const getBrandSeoData = cache(async (id: string) => {
  const db = createSupabaseAdminClient();
  const [brandResult, productsResult] = await Promise.all([
    db.from("brands").select("id,name,name_kana").eq("id", id).maybeSingle(),
    db.from("products").select("id,name,category,additional_categories", { count: "exact" }).eq("brand_id", id).eq("is_active", true).order("name").limit(20),
  ]);
  if (brandResult.error) throw new Error(`ブランドSEO情報の取得に失敗しました: ${brandResult.error.message}`);
  if (productsResult.error) throw new Error(`ブランド商品情報の取得に失敗しました: ${productsResult.error.message}`);
  if (!brandResult.data) return null;
  return { brand: brandResult.data as BrandSeoRow, products: (productsResult.data ?? []) as BrandProductRow[], productCount: productsResult.count ?? 0 };
});

const sitemapCatalogCache = new Map<string, { expiresAt: number; promise: Promise<SitemapPage> }>();
let sitemapProductCountCache: { expiresAt: number; promise: Promise<number> } | null = null;

export async function getActiveProductCount() {
  const now = Date.now();
  if (sitemapProductCountCache && sitemapProductCountCache.expiresAt > now) return sitemapProductCountCache.promise;
  const promise = (async () => {
    const result = await createSupabaseAdminClient().from("products").select("id", { count: "exact", head: true }).eq("is_active", true);
    if (result.error) throw new Error(`商品サイトマップ件数の取得に失敗しました: ${result.error.message}`);
    return result.count ?? 0;
  })().catch((error: unknown) => {
    if (sitemapProductCountCache?.promise === promise) sitemapProductCountCache = null;
    throw error;
  });
  sitemapProductCountCache = { expiresAt: now + 300_000, promise };
  return promise;
}

async function loadCatalogSitemapPage(page: number, pageSize: number, includeBrands: boolean): Promise<SitemapPage> {
  const db = createSupabaseAdminClient();
  const offset = page * pageSize;
  const [productsResult, brandsResult] = await Promise.all([
    db.from("products").select("id").eq("is_active", true).order("id").range(offset, offset + pageSize - 1),
    includeBrands ? db.from("brands").select("id").order("id") : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsResult.error) throw new Error(`商品サイトマップ情報の取得に失敗しました: ${productsResult.error.message}`);
  if (brandsResult.error) throw new Error(`ブランドサイトマップ情報の取得に失敗しました: ${brandsResult.error.message}`);
  return {
    products: (productsResult.data ?? []).map((row) => ({ id: row.id })),
    brands: (brandsResult.data ?? []).map((row) => row.id),
  };
}
export const getCatalogSitemapPage = cache(async (page: number, pageSize: number, includeBrands = false) => {
  const key = `${page}:${pageSize}:${includeBrands ? 1 : 0}`;
  const now = Date.now();
  const cached = sitemapCatalogCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;
  const promise = loadCatalogSitemapPage(page, pageSize, includeBrands).catch((error) => {
    if (sitemapCatalogCache.get(key)?.promise === promise) sitemapCatalogCache.delete(key);
    throw error;
  });
  sitemapCatalogCache.set(key, { expiresAt: now + 300_000, promise });
  return promise;
});
