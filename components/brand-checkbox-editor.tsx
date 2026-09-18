"use client";

import { useMemo, useState } from "react";

type BrandChoice = { id: string; name: string; nameKana?: string };

export function BrandCheckboxEditor({ brands, initialIds = [] }: { brands: BrandChoice[]; initialIds?: string[] }) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set(initialIds));
  const visibleBrands = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("ja");
    return keyword
      ? brands.filter((brand) => `${brand.name} ${brand.nameKana ?? ""}`.toLocaleLowerCase("ja").includes(keyword))
      : brands;
  }, [brands, query]);

  function setChecked(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function selectVisible() {
    setSelectedIds((current) => new Set([...current, ...visibleBrands.map((brand) => brand.id)]));
  }

  function clearVisible() {
    const visibleIds = new Set(visibleBrands.map((brand) => brand.id));
    setSelectedIds((current) => new Set([...current].filter((id) => !visibleIds.has(id))));
  }

  return <fieldset className="brand-checkbox-editor">
    <legend>取扱いブランド（複数選択可）</legend>
    {[...selectedIds].map((id) => <input key={id} type="hidden" name="provisionalBrandIds" value={id}/>)}
    <div className="brand-checkbox-toolbar">
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ブランド名・かなで検索" aria-label="取扱いブランドを検索"/>
      <span><b>{selectedIds.size}</b>件選択中</span>
    </div>
    <div className="brand-checkbox-actions">
      <button type="button" disabled={!visibleBrands.length} onClick={selectVisible}>表示中をすべて選択</button>
      <button type="button" disabled={!visibleBrands.length} onClick={clearVisible}>表示中の選択を解除</button>
    </div>
    <div className="brand-checkbox-list">
      {visibleBrands.map((brand) => <label key={brand.id}>
        <input type="checkbox" checked={selectedIds.has(brand.id)} onChange={(event) => setChecked(brand.id, event.target.checked)}/>
        <span><b>{brand.name}</b>{brand.nameKana && <small>{brand.nameKana}</small>}</span>
      </label>)}
      {!visibleBrands.length && <p>条件に一致するブランドはありません。</p>}
    </div>
  </fieldset>;
}
