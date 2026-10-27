import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {NewCosmeticsCalendar} from "@/components/new-cosmetics-calendar";
import {formatVariantName} from "@/lib/variant-name";
import {ProductCategoryBadges} from "@/components/product-category-badge";
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
function ProductList({ products, selectedDate }: { products: NewProduct[]; selectedDate: string }) {
  if (!products.length) return <div className="new-cosmetics-empty"><b>この日に発売される商品はありません</b><p>週間カレンダー、または日付選択から別の日を確認できます。</p></div>;

  return <div className="new-cosmetics-list">
    <div className="new-cosmetics-list-head" aria-hidden="true">
      <span>商品 / ブランド</span>
      <span>カテゴリ</span>
      <span>カラー / バリエーション</span>
    </div>
    {products.map((product) => {
    const variants = product.product_variants.filter((variant) => variant.release_date === selectedDate);
    return <Link href={`/products/${product.id}`} className="new-cosmetics-list-row" key={product.id}>
      <span className="new-cosmetics-product-name">
        <b>{product.name}</b>
        <small>{brandName(product.brands) || "ブランド未設定"}</small>
      </span>
      <ProductCategoryBadges categories={[product.category,...(product.additional_categories??[])]}/>
      <span className="new-cosmetics-list-variants">
        {variants.length > 0
          ? variants.map((variant) => formatVariantName({ name: variant.variant_name, colorCode: variant.color_code })).join(" / ")
          : "—"}
      </span>
    </Link>;
  })}</div>;
}
import type {loadPage} from "@/lib/server/mobile-pages/new-products";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function NewProductsView({model}:{model:Model}){
const {today,selectedDate,resultError,products,dateLabel}=model;
return <><SiteHeader/><main className="new-cosmetics-index-page"><section>
    <header className="new-cosmetics-index-head"><div><p className="eyebrow">NEW COSMETICS</p><h1>新作コスメ</h1><p>発売日を選んで、その日に登場する商品や新色を確認できます。</p></div><Link href="/products">すべての商品を検索</Link></header>
    <NewCosmeticsCalendar selectedDate={selectedDate} today={today}/>
    {resultError ? <div className="product-search-empty is-error"><span>!</span><b>新作コスメを読み込めませんでした</b><p>少し待ってから、もう一度お試しください。</p></div> : <section className="new-cosmetics-day-group">
      <div className="new-cosmetics-group-head"><div><span className={selectedDate > today ? "upcoming-dot" : "released-dot"}/><h2>{dateLabel}発売の商品</h2></div><small>{products.length}件</small></div>
      <ProductList products={products} selectedDate={selectedDate}/>
    </section>}
  </section></main></>;
}
