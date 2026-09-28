import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NewCosmeticsCalendar } from "@/components/new-cosmetics-calendar";
import { formatVariantName } from "@/lib/variant-name";
import { ProductCategoryBadges } from "@/components/product-category-badge";

export const dynamic = "force-dynamic";

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

function displayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

function ProductCards({ products, selectedDate, today }: { products: NewProduct[]; selectedDate: string; today: string }) {
  if (!products.length) return <div className="new-cosmetics-empty"><b>この日に発売される商品はありません</b><p>週間カレンダー、または日付選択から別の日を確認できます。</p></div>;
  const badge = selectedDate === today ? "本日発売" : selectedDate > today ? "発売予定" : "発売済み";
  const badgeClass = selectedDate > today ? "upcoming" : "released";

  return <div className="home-new-grid new-cosmetics-grid">{products.map((product) => {
    const variants = product.product_variants.filter((variant) => variant.release_date === selectedDate);
    return <Link href={`/products/${product.id}`} className="home-new-card" key={product.id}>
      <span className={badgeClass}>{badge}</span>
      <small>{brandName(product.brands) || "ブランド未設定"}</small>
      <h3>{product.name}</h3>
      <ProductCategoryBadges categories={[product.category,...(product.additional_categories??[])]}/>
      {variants.length > 0 && <div className="new-cosmetics-variants"><b>この日の新色</b><span>{variants.map((variant) => formatVariantName({ name: variant.variant_name, colorCode: variant.color_code })).join(" / ")}</span></div>}
      <time dateTime={selectedDate}>{displayDate(selectedDate)}</time>
    </Link>;
  })}</div>;
}

export default async function NewCosmeticsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
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
  const resultError = datedProducts.error ?? datedVariants.error ?? variantProducts.error;
  const products = [...directRows, ...((variantProducts.data ?? []) as unknown as NewProduct[])]
    .sort((a, b) => brandName(a.brands).localeCompare(brandName(b.brands), "ja"));
  const dateLabel = selectedDate === today ? "今日" : selectedDate === shiftDate(today, -1) ? "昨日" : selectedDate === shiftDate(today, 1) ? "明日" : "選択日";

  return <><SiteHeader/><main className="new-cosmetics-index-page"><section>
    <header className="new-cosmetics-index-head"><div><p className="eyebrow">NEW COSMETICS</p><h1>新作コスメ</h1><p>発売日を選んで、その日に登場する商品や新色を確認できます。</p></div><Link href="/products">すべての商品を検索</Link></header>
    <NewCosmeticsCalendar selectedDate={selectedDate} today={today}/>
    {resultError ? <div className="product-search-empty is-error"><span>!</span><b>新作コスメを読み込めませんでした</b><p>少し待ってから、もう一度お試しください。</p></div> : <section className="new-cosmetics-day-group">
      <div className="new-cosmetics-group-head"><div><span className={selectedDate > today ? "upcoming-dot" : "released-dot"}/><h2>{dateLabel}発売の商品</h2></div><small>{products.length}件</small></div>
      <ProductCards products={products} selectedDate={selectedDate} today={today}/>
    </section>}
  </section></main></>;
}
