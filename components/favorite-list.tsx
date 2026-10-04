"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Favorites = { products: { id: string }[]; stores: { id: string }[] };
export function FavoriteList() {
  const [favorites, setFavorites] = useState<Favorites | null>(null);
  useEffect(() => { let active = true; const load = () => void fetch("/api/auth/favorites", { cache: "no-store" }).then(async (response) => { if (!response.ok) return; const data = await response.json() as Favorites; if (active) setFavorites(data); }); load(); window.addEventListener("cosfind-favorites-updated", load); return () => { active = false; window.removeEventListener("cosfind-favorites-updated", load); }; }, []);
  if (!favorites) return null;
  return <section className="profile-favorites"><div className="profile-favorites-head"><h2>お気に入り</h2></div><div className="profile-favorite-links"><Link href="/profile/favorites/products"><span>お気に入り商品</span><b>{favorites.products.length}/100件</b><small>一覧・編集へ →</small></Link><Link href="/profile/favorites/stores"><span>お気に入り店舗</span><b>{favorites.stores.length}/10件</b><small>一覧・編集へ →</small></Link></div></section>;
}
