import "server-only";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
type NewProduct = {
  id: string;
  name: string;
  category: string;
  additional_categories: string[] | null;
  release_date: string | null;
  brands: { name: string } | { name: string }[] | null;
  product_variants: { id: string; variant_name: string; color_code: string | null; release_date: string | null }[];
};
function brandName(value: NewProduct["brands"]) {
  return Array.isArray(value) ? value[0]?.name ?? "" : value?.name ?? "";
}
function tokyoToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}
function validDate(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? fallback : value;
}
function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export async function loadPage({ searchParams }: { searchParams: Promise<{ date?: string }> }){
  const today = tokyoToday();
  const selectedDate = validDate((await searchParams).date, today);
  const db = createSupabaseAdminClient();
  const columns = "id,name,category,additional_categories,release_date,brands(name),product_variants(id,variant_name,color_code,release_date)";
  const [datedProducts, datedVariants] = await Promise.all([
    db.from("products").select(columns).eq("is_active", true).eq("release_date", selectedDate).order("created_at", { referencedTable: "product_variants" }).limit(500),
    db.from("product_variants").select("product_id").eq("release_date", selectedDate).limit(1000),
  ]);
  const directRows = (datedProducts.data ?? []) as unknown as NewProduct[];
  const directIds = new Set(directRows.map((product) => product.id));
  const variantProductIds = [...new Set((datedVariants.data ?? []).map((variant) => variant.product_id).filter((id) => !directIds.has(id)))];
  const variantProducts = variantProductIds.length
    ? await db.from("products").select(columns).eq("is_active", true).in("id", variantProductIds).order("created_at", { referencedTable: "product_variants" })
    : { data: [] as unknown[], error: null };
  const resultError = Boolean(datedProducts.error ?? datedVariants.error ?? variantProducts.error);
  const products = [...directRows, ...((variantProducts.data ?? []) as unknown as NewProduct[])]
    .sort((a, b) => brandName(a.brands).localeCompare(brandName(b.brands), "ja"));
  const dateLabel = selectedDate === today ? "今日" : selectedDate === shiftDate(today, -1) ? "昨日" : selectedDate === shiftDate(today, 1) ? "明日" : "選択日";

  return {today,selectedDate,resultError,products,dateLabel};
}
