"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "./site-header";
import { FavoriteButton } from "./favorite-button";
import { formatStoreName } from "@/lib/store-name";
import { ProductCategoryBadges } from "./product-category-badge";

type ProductFavorite = { id: string; name: string; brand: string; category: string; additionalCategories: string[]; variants: { name: string; colorCode: string }[] };
type StoreFavorite = { id: string; name: string; chain: string; address: string };
type Favorites = { products: ProductFavorite[]; stores: StoreFavorite[] };
type FavoriteKind = "products" | "stores";

export function FavoriteManager({ kind }: { kind: FavoriteKind }) {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorites | null>(null);
  const [visibleKind, setVisibleKind] = useState<FavoriteKind>(kind);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigationTimer = useRef<number | null>(null);

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

  useEffect(() => { setQuery(""); setBrand(""); setCategory(""); setSelected([]); }, [kind]);
  useEffect(() => { setVisibleKind(kind); }, [kind]);
  useEffect(() => {
    router.prefetch("/profile/favorites/products");
    router.prefetch("/profile/favorites/stores");
    return () => {
      if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current);
    };
  }, [router]);
  useEffect(() => { load(); window.addEventListener("cosfind-favorites-updated", load); return () => window.removeEventListener("cosfind-favorites-updated", load); }, [load]);

  const keyword = query.trim().toLowerCase();
  const productBrands = useMemo(() => [...new Set((favorites?.products ?? []).map((item) => item.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja")), [favorites]);
  const productCategories = useMemo(() => [...new Set((favorites?.products ?? []).flatMap((item) => [item.category, ...(item.additionalCategories ?? [])]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja")), [favorites]);
  const products = useMemo(() => (favorites?.products ?? []).filter((item) => {
    const categories = [item.category, ...(item.additionalCategories ?? [])];
    const searchable = `${item.name} ${item.brand} ${categories.join(" ")} ${(item.variants ?? []).map((variant) => `${variant.name} ${variant.colorCode}`).join(" ")}`.toLowerCase();
    return searchable.includes(keyword) && (!brand || item.brand === brand) && (!category || categories.includes(category));
  }), [favorites, keyword, brand, category]);
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

  function switchFavoritePage(nextKind: FavoriteKind, event: React.MouseEvent<HTMLAnchorElement>) {
    if (nextKind === kind) return;
    event.preventDefault();
    if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current);
    setVisibleKind(nextKind);
    const href = `/profile/favorites/${nextKind}`;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }
    navigationTimer.current = window.setTimeout(() => router.push(href), 320);
  }

  return <>
    <SiteHeader />
    <main className="favorite-management-page">
      <section>
        <div className="favorite-management-head">
          <div><p className="eyebrow">MY FAVORITES</p><h1>{productPage ? "お気に入り商品" : "お気に入り店舗"}</h1><p>{productPage ? "登録した商品を確認・整理できます。" : "登録した店舗を確認・整理できます。"}</p></div>
          <Link href="/profile">プロフィールへ戻る</Link>
        </div>
        <nav className={`favorite-management-tabs${visibleKind === "stores" ? " show-stores" : ""}`} aria-label="お気に入りの切り替え">
          <Link href="/profile/favorites/products" aria-current={visibleKind === "products" ? "page" : undefined} onClick={(event) => switchFavoritePage("products", event)}>お気に入り商品 <b>{productCount}/100件</b></Link>
          <Link href="/profile/favorites/stores" aria-current={visibleKind === "stores" ? "page" : undefined} onClick={(event) => switchFavoritePage("stores", event)}>お気に入り店舗 <b>{storeCount}/10件</b></Link>
        </nav>
        {error && <p className="form-error">{error}</p>}
        {!favorites ? <p>読み込み中…</p> : <>
          {productPage ? <div className="favorite-product-filters">
            <label><span>キーワード</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="商品名・カラー名・色番"/></label>
            <label><span>ブランド</span><select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="">すべてのブランド</option>{productBrands.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label><span>カテゴリ</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">すべてのカテゴリ</option>{productCategories.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <button type="button" disabled={!query&&!brand&&!category} onClick={() => { setQuery(""); setBrand(""); setCategory(""); }}>条件をクリア</button>
          </div> : <div className="favorite-management-toolbar"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="店舗名・チェーン名・住所で検索"/></div>}
          <div className="favorite-management-toolbar selection-only">
            <button type="button" className="danger" disabled={!selected.length || deleting} onClick={() => void removeSelected()}>{deleting ? "削除中…" : `選択した項目を削除（${selected.length}）`}</button>
          </div>
          {productPage ? <FavoriteSection title="お気に入り商品" count={products.length} total={productCount} limit={100} empty="該当するお気に入り商品はありません。" selectAll={() => setSelected(visibleIds)} clear={() => setSelected([])}>
            {products.map((product) => <div className="favorite-management-row" key={product.id}><input type="checkbox" aria-label={`${product.name}を選択`} checked={selected.includes(product.id)} onChange={() => toggle(product.id)}/><Link href={`/products/${product.id}`}><b>{product.name}</b><small>{product.brand}</small><ProductCategoryBadges categories={[product.category,...(product.additionalCategories??[])]}/></Link><FavoriteButton kind="product" id={product.id} compact/></div>)}
          </FavoriteSection> : <FavoriteSection title="お気に入り店舗" count={stores.length} total={storeCount} limit={10} empty="該当するお気に入り店舗はありません。" selectAll={() => setSelected(visibleIds)} clear={() => setSelected([])}>
            {stores.map((store) => <div className="favorite-management-row" key={store.id}><input type="checkbox" aria-label={`${formatStoreName(store)}を選択`} checked={selected.includes(store.id)} onChange={() => toggle(store.id)}/><Link href={`/stores/${store.id}`}><b>{formatStoreName(store)}</b><small>{store.address}</small></Link><FavoriteButton kind="store" id={store.id} compact/></div>)}
          </FavoriteSection>}
        </>}
      </section>
    </main>
  </>;
}

function FavoriteSection({ title, count, total, limit, empty, selectAll, clear, children }: { title: string; count: number; total: number; limit: number; empty: string; selectAll: () => void; clear: () => void; children: React.ReactNode }) {
  return <section className="favorite-management-section"><header><h2>{title} <b>{total}/{limit}件</b>{count!==total&&<small>{count}件表示</small>}</h2><span><button type="button" onClick={selectAll} disabled={!count}>すべて選択</button><button type="button" onClick={clear}>選択解除</button></span></header>{count ? children : <p className="favorite-empty">{empty}</p>}</section>;
}
