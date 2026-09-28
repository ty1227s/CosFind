import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ProductCategoryBadges } from "@/components/product-category-badge";

export const dynamic = "force-dynamic";

type BrandRow = {
  id: string;
  name: string;
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  additional_categories: string[] | null;
  product_variants: { id: string }[];
};

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const [brandResult, productsResult] = await Promise.all([
    db.from("brands").select("id,name").eq("id", id).maybeSingle(),
    db.from("products")
      .select("id,name,category,additional_categories,product_variants(id)")
      .eq("brand_id", id)
      .eq("is_active", true)
      .order("name"),
  ]);

  if (brandResult.error || !brandResult.data) notFound();
  if (productsResult.error) throw productsResult.error;

  const brand = brandResult.data as BrandRow;
  const products = (productsResult.data ?? []) as unknown as ProductRow[];

  return <>
    <SiteHeader />
    <main className="product-search-page brand-detail-page">
      <section>
        <header className="product-search-head brand-detail-head">
          <div>
            <p className="eyebrow">BRAND</p>
            <h1>{brand.name}</h1>
            <p>{brand.name}の商品を一覧で確認できます。</p>
          </div>
          <Link href="/brands">← ブランドから探すへ戻る</Link>
        </header>
        <div className="product-search-content">
          <div className="product-search-result-head">
            <div><b>{products.length}</b><span>商品</span></div>
            <small>商品を選ぶと詳細と店舗情報を確認できます</small>
          </div>
          {products.length ? <div className="product-search-list">
            {products.map((product) => <Link href={`/products/${product.id}`} className="product-search-list-row" key={product.id}>
              <span><small>{brand.name}</small><b>{product.name}</b></span>
              <ProductCategoryBadges categories={[product.category, ...(product.additional_categories ?? [])]}/>
              <span>{Math.max(1, product.product_variants.length)}種</span>
              <strong>詳細を見る <i>→</i></strong>
            </Link>)}
          </div> : <div className="product-search-empty">
            <span>○</span>
            <b>登録商品はまだありません</b>
            <p>このブランドの商品が登録されると、ここに表示されます。</p>
          </div>}
        </div>
      </section>
    </main>
  </>;
}
