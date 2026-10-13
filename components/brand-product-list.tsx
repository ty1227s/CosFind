"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductCategoryBadges } from "@/components/product-category-badge";
import { PRODUCT_CATEGORY_GROUPS } from "@/lib/product-categories";
import type { loadPage } from "@/lib/server/mobile-pages/brand";

type Model = Awaited<ReturnType<typeof loadPage>>;
export function BrandProductList({ brand, products }: Pick<Model, "brand" | "products">) {
  const [category, setCategory] = useState("");
  const available = new Set(products.flatMap((product) => [product.category, ...(product.additional_categories ?? [])]).filter(Boolean));
  const known = new Set<string>(PRODUCT_CATEGORY_GROUPS.flatMap((group) => [...group.categories]));
  const otherCategories = [...available].filter((name) => !known.has(name)).sort((a, b) => a.localeCompare(b, "ja"));
  const visibleProducts = category ? products.filter((product) => product.category === category || product.additional_categories?.includes(category)) : products;
  return (
        <div className="product-search-content">
          {products.length > 0 && <label className="brand-genre-filter">
            <span>ジャンル</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">すべてのジャンル</option>
              {PRODUCT_CATEGORY_GROUPS.map((group) => {
                const options = group.categories.filter((name) => available.has(name));
                return options.length > 0 ? <optgroup label={group.label} key={group.label}>
                  {options.map((name) => <option key={name} value={name}>{name}</option>)}
                </optgroup> : null;
              })}
              {otherCategories.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>}
          <div className="product-search-result-head">
            <div role="status" aria-live="polite"><b>{visibleProducts.length}</b><span>商品</span></div>
            <small>商品を選ぶと詳細と店舗情報を確認できます</small>
          </div>
          {visibleProducts.length ? <div className="product-search-list">
            {visibleProducts.map((product) => <Link href={`/products/${product.id}`} className="product-search-list-row" key={product.id}>
              <span><small>{brand.name}</small><b>{product.name}</b></span>
              <ProductCategoryBadges categories={[product.category, ...(product.additional_categories ?? [])]}/>
              <span>{Math.max(1, product.product_variants.length)}種</span>
              <strong>詳細を見る <i>→</i></strong>
            </Link>)}
          </div> : <div className="product-search-empty">
            <span>○</span>
            <b>{products.length ? "該当する商品はありません" : "登録商品はまだありません"}</b>
            <p>{products.length ? "別のジャンルを選択してください。" : "このブランドの商品が登録されると、ここに表示されます。"}</p>
          </div>}
        </div>
  );
}
