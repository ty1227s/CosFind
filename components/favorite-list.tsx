"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FavoriteButton } from "./favorite-button";
import { formatStoreName } from "@/lib/store-name";

type Favorites = { products: { id: string; name: string; brand: string }[]; stores: { id: string; name: string; chain: string; address: string }[] };
export function FavoriteList() {
  const [favorites, setFavorites] = useState<Favorites | null>(null);
  useEffect(() => { let active = true; const load = () => void fetch("/api/auth/favorites", { cache: "no-store" }).then(async (response) => { if (!response.ok) return; const data = await response.json() as Favorites; if (active) setFavorites(data); }); load(); window.addEventListener("cosfind-favorites-updated", load); return () => { active = false; window.removeEventListener("cosfind-favorites-updated", load); }; }, []);
  if (!favorites) return null;
  return <section className="profile-favorites"><div className="profile-favorites-head"><h2>お気に入り</h2><Link href="/profile/favorites">すべて見る・編集</Link></div><div className="favorite-columns"><div><h3>お気に入り商品 <b>{favorites.products.length}/100件</b></h3>{favorites.products.length ? favorites.products.map((product) => <div className="favorite-row" key={product.id}><Link href={`/products/${product.id}`}><b>{product.name}</b><small>{product.brand}</small></Link><FavoriteButton kind="product" id={product.id} compact/></div>) : <p>お気に入り商品はありません。</p>}</div><div><h3>お気に入り店舗 <b>{favorites.stores.length}/10件</b></h3>{favorites.stores.length ? favorites.stores.map((store) => <div className="favorite-row" key={store.id}><Link href={`/stores/${store.id}`}><b>{formatStoreName(store)}</b><small>{store.address}</small></Link><FavoriteButton kind="store" id={store.id} compact/></div>) : <p>お気に入り店舗はありません。</p>}</div></div></section>;
}
