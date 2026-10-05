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
type SitemapProductRow = { id: string; brands: { id: string } | { id: string }[] | null };

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

export const getCatalogSitemapEntries = cache(async () => {
  const db = createSupabaseAdminClient();
  const rows: SitemapProductRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 50000; offset += pageSize) {
    const result = await db.from("products").select("id,brands(id)").eq("is_active", true).order("id").range(offset, offset + pageSize - 1);
    if (result.error) throw new Error(`商品サイトマップ情報の取得に失敗しました: ${result.error.message}`);
    const page = (result.data ?? []) as unknown as SitemapProductRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  const brandIds = new Set<string>();
  for (const row of rows) {
    const brands = Array.isArray(row.brands) ? row.brands : row.brands ? [row.brands] : [];
    for (const brand of brands) brandIds.add(brand.id);
  }
  return {
    products: rows.map((row) => ({ id: row.id })),
    brands: [...brandIds],
  };
});
