"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "./site-header";
import { FavoriteButton } from "./favorite-button";
import { formatStoreName } from "@/lib/store-name";

type ProductFavorite = { id: string; name: string; brand: string };
type StoreFavorite = { id: string; name: string; chain: string; address: string };
type Favorites = { products: ProductFavorite[]; stores: StoreFavorite[] };
type FavoriteKind = "products" | "stores";

export function FavoriteManager({ kind }: { kind: FavoriteKind }) {
  const [favorites, setFavorites] = useState<Favorites | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => void fetch("/api/auth/favorites", { cache: "no-store" })
    .then(async (response) => {
      if (response.status === 401) { window.location.href = "/login"; return; }
      const data = await response.json() as Favorites & { error?: string };
      if (!response.ok) throw new Error(data.error || "読み込めませんでした");
      setFavorites(data);
      const availableIds = new Set((kind === "products" ? data.products : data.stores).map((item) => item.id));
      setSelected((ids) => ids.filter((id) => availableIds.has(id)));
      setError("");
    })
    .catch((cause) => setError(cause instanceof Error ? cause.message : "読み込めませんでした")), [kind]);

  useEffect(() => { setQuery(""); setSelected([]); }, [kind]);
  useEffect(() => { load(); window.addEventListener("cosfind-favorites-updated", load); return () => window.removeEventListener("cosfind-favorites-updated", load); }, [load]);

  const keyword = query.trim().toLowerCase();
  const products = useMemo(() => (favorites?.products ?? []).filter((item) => `${item.name} ${item.brand}`.toLowerCase().includes(keyword)), [favorites, keyword]);
  const stores = useMemo(() => (favorites?.stores ?? []).filter((item) => `${item.name} ${item.chain} ${item.address}`.toLowerCase().includes(keyword)), [favorites, keyword]);
  const visibleIds = (kind === "products" ? products : stores).map((item) => item.id);

  function toggle(id: string) {
    setSelected((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  async function removeSelected() {
    if (!selected.length || !confirm(`選択した${selected.length}件をお気に入りから削除しますか？`)) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "products" ? { productIds: selected, storeIds: [] } : { productIds: [], storeIds: selected }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "削除できませんでした");
      setSelected([]);
      load();
      window.dispatchEvent(new Event("cosfind-favorites-updated"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "削除できませんでした");
    } finally {
      setDeleting(false);
    }
  }

  const productCount = favorites?.products.length ?? 0;
  const storeCount = favorites?.stores.length ?? 0;
  const productPage = kind === "products";

  return <>
    <SiteHeader />
    <main className="favorite-management-page">
      <section>
        <div className="favorite-management-head">
          <div><p className="eyebrow">MY FAVORITES</p><h1>{productPage ? "お気に入り商品" : "お気に入り店舗"}</h1><p>{productPage ? "登録した商品を確認・整理できます。" : "登録した店舗を確認・整理できます。"}</p></div>
          <Link href="/profile">プロフィールへ戻る</Link>
        </div>
        <nav className="favorite-management-tabs" aria-label="お気に入りの切り替え">
          <Link href="/profile/favorites/products" aria-current={productPage ? "page" : undefined}>お気に入り商品 <b>{productCount}/100件</b></Link>
          <Link href="/profile/favorites/stores" aria-current={!productPage ? "page" : undefined}>お気に入り店舗 <b>{storeCount}/10件</b></Link>
        </nav>
        {error && <p className="form-error">{error}</p>}
        {!favorites ? <p>読み込み中…</p> : <>
          <div className="favorite-management-toolbar">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={productPage ? "商品名・ブランドで検索" : "店舗名・チェーン名・住所で検索"}/>
            <button type="button" className="danger" disabled={!selected.length || deleting} onClick={() => void removeSelected()}>{deleting ? "削除中…" : `選択した項目を削除（${selected.length}）`}</button>
          </div>
          {productPage ? <FavoriteSection title="お気に入り商品" count={products.length} total={productCount} limit={100} empty="該当するお気に入り商品はありません。" selectAll={() => setSelected(visibleIds)} clear={() => setSelected([])}>
            {products.map((product) => <div className="favorite-management-row" key={product.id}><input type="checkbox" aria-label={`${product.name}を選択`} checked={selected.includes(product.id)} onChange={() => toggle(product.id)}/><Link href={`/products/${product.id}`}><b>{product.name}</b><small>{product.brand}</small></Link><FavoriteButton kind="product" id={product.id} compact/></div>)}
          </FavoriteSection> : <FavoriteSection title="お気に入り店舗" count={stores.length} total={storeCount} limit={10} empty="該当するお気に入り店舗はありません。" selectAll={() => setSelected(visibleIds)} clear={() => setSelected([])}>
            {stores.map((store) => <div className="favorite-management-row" key={store.id}><input type="checkbox" aria-label={`${formatStoreName(store)}を選択`} checked={selected.includes(store.id)} onChange={() => toggle(store.id)}/><Link href={`/stores/${store.id}`}><b>{formatStoreName(store)}</b><small>{store.address}</small></Link><FavoriteButton kind="store" id={store.id} compact/></div>)}
          </FavoriteSection>}
        </>}
      </section>
    </main>
  </>;
}

function FavoriteSection({ title, count, total, limit, empty, selectAll, clear, children }: { title: string; count: number; total: number; limit: number; empty: string; selectAll: () => void; clear: () => void; children: React.ReactNode }) {
  return <section className="favorite-management-section"><header><h2>{title} <b>{total}/{limit}件</b></h2><span><button type="button" onClick={selectAll} disabled={!count}>すべて選択</button><button type="button" onClick={clear}>選択解除</button></span></header>{count ? children : <p className="favorite-empty">{empty}</p>}</section>;
}
