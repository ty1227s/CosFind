"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getFavorites, type FavoritesData } from "@/lib/favorites-cache";

export function FavoriteList() {
  const [favorites, setFavorites] = useState<FavoritesData | null>(null);
  useEffect(() => { let active = true; const load = () => void getFavorites().then((data) => { if (active) setFavorites(data); }).catch(() => undefined); load(); window.addEventListener("cosfind-favorites-updated", load); return () => { active = false; window.removeEventListener("cosfind-favorites-updated", load); }; }, []);
  if (!favorites) return null;
  return <section className="profile-favorites"><div className="profile-favorites-head"><h2>お気に入り</h2></div><div className="profile-favorite-links"><Link href="/profile/favorites/products"><span>お気に入り商品</span><b>{favorites.products.length}/100件</b><small>一覧・編集へ →</small></Link><Link href="/profile/favorites/stores"><span>お気に入り店舗</span><b>{favorites.stores.length}/10件</b><small>一覧・編集へ →</small></Link></div></section>;
}
