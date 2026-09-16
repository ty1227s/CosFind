"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type StoreProductItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  reportedAt: string;
};

export function StoreProductList({ items }: { items: StoreProductItem[] }) {
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const brands = useMemo(() => [...new Set(items.map((item) => item.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja")), [items]);
  const categories = useMemo(() => [...new Set(items.filter((item) => !brand || item.brand === brand).map((item) => item.category))].sort((a, b) => a.localeCompare(b, "ja")), [items, brand]);
  const filtered = useMemo(() => items.filter((item) => (!brand || item.brand === brand) && (!category || item.category === category)), [items, brand, category]);

  if (!items.length) return <div className="empty-state"><b>この店舗の在庫報告はまだありません</b><p>商品を見つけたら情報提供をお願いします。</p></div>;

  return <>
    <div className="store-product-filters">
      <label><span>ブランド</span><select value={brand} onChange={(event) => { setBrand(event.target.value); setCategory(""); }}><option value="">すべてのブランド</option>{brands.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      <label><span>商品ジャンル</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">すべての商品ジャンル</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      {(brand || category) && <button type="button" onClick={() => { setBrand(""); setCategory(""); }}>条件をクリア</button>}
      <small>{filtered.length}件</small>
    </div>
    {filtered.length ? filtered.map((item) => <Link className="detail-row" href={`/products/${item.id}`} key={item.id}><span><b>{item.brand} / {item.name}</b><small>{item.category}</small></span><span>最終情報 {new Date(item.reportedAt).toLocaleDateString("ja-JP")} ›</span></Link>) : <div className="empty-state"><b>条件に一致する商品はありません</b><p>ブランドまたは商品ジャンルを変更してください。</p></div>}
  </>;
}
