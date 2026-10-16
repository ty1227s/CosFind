import "server-only";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {fetchAllSupabaseRows} from "@/lib/supabase-pagination";
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
  const [directRows, datedVariants] = await Promise.all([
    fetchAllSupabaseRows<NewProduct>((from,to)=>db.from("products").select(columns).eq("is_active", true).eq("release_date", selectedDate).order("id").order("created_at", { referencedTable: "product_variants" }).range(from,to),500),
    fetchAllSupabaseRows<{product_id:string}>((from,to)=>db.from("product_variants").select("product_id").eq("release_date", selectedDate).order("product_id").range(from,to)),
  ]);
  const directIds = new Set(directRows.map((product) => product.id));
  const variantProductIds = [...new Set(datedVariants.map((variant) => variant.product_id).filter((id) => !directIds.has(id)))];
  const variantRows:NewProduct[]=[];
  for(let index=0;index<variantProductIds.length;index+=200){const ids=variantProductIds.slice(index,index+200);const result=await db.from("products").select(columns).eq("is_active", true).in("id",ids).order("id").order("created_at", { referencedTable: "product_variants" });if(result.error)throw result.error;variantRows.push(...((result.data??[]) as unknown as NewProduct[]));}
  const resultError = false;
  const products = [...directRows, ...variantRows]
    .sort((a, b) => brandName(a.brands).localeCompare(brandName(b.brands), "ja"));
  const dateLabel = selectedDate === today ? "今日" : selectedDate === shiftDate(today, -1) ? "昨日" : selectedDate === shiftDate(today, 1) ? "明日" : "選択日";

  return {today,selectedDate,resultError,products,dateLabel};
}
