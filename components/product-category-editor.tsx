"use client";

import { useState } from "react";
import { PRODUCT_CATEGORY_GROUPS } from "@/lib/product-categories";

export function ProductCategoryEditor({ primaryCategory, additionalCategories = [] }: { primaryCategory: string; additionalCategories?: string[] }) {
  const [primary, setPrimary] = useState(primaryCategory);
  const [selected, setSelected] = useState(() => new Set(additionalCategories.filter((category) => category !== primaryCategory)));

  function changePrimary(nextPrimary: string) {
    setPrimary(nextPrimary);
    setSelected((current) => {
      const next = new Set(current);
      next.delete(nextPrimary);
      return next;
    });
  }

  function toggle(category: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(category); else next.delete(category);
      return next;
    });
  }

  return <fieldset className="product-category-editor">
    <legend>商品カテゴリ</legend>
    <label className="product-primary-category"><span>主カテゴリ（必須）</span><select name="category" value={primary} onChange={(event) => changePrimary(event.target.value)} required><option value="">カテゴリを選択</option>{PRODUCT_CATEGORY_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.categories.map((category) => <option key={category} value={category}>{category}</option>)}</optgroup>)}</select></label>
    {[...selected].map((category) => <input key={category} type="hidden" name="additionalCategories" value={category}/>)}
    <div className="product-additional-category-head"><b>追加カテゴリ（複数選択可）</b><span><strong>{selected.size}</strong>件選択中</span></div>
    <div className="product-category-checkboxes">
      {PRODUCT_CATEGORY_GROUPS.map((group) => <section key={group.label}><h3>{group.label}</h3><div>{group.categories.map((category) => <label key={category} className={category === primary ? "is-primary" : ""}><input type="checkbox" checked={category === primary || selected.has(category)} disabled={category === primary} onChange={(event) => toggle(category, event.target.checked)}/><span>{category}{category === primary && <small>主</small>}</span></label>)}</div></section>)}
    </div>
  </fieldset>;
}
