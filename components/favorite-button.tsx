"use client";
import { useEffect, useState } from "react";
import { FavoritesRequestError, getFavorites, invalidateFavoritesCache } from "@/lib/favorites-cache";

export function FavoriteButton({ kind, id, compact = false }: { kind: "product" | "store"; id: string; compact?: boolean }) {
  const [favorite, setFavorite] = useState(false); const [authenticated, setAuthenticated] = useState<boolean | null>(null); const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; void getFavorites().then((data) => { if (active) { setAuthenticated(true); setFavorite((kind === "product" ? data.productIds : data.storeIds).includes(id)); } }).catch((error) => { if (active) setAuthenticated(error instanceof FavoritesRequestError && error.status === 401 ? false : null); }); return () => { active = false; }; }, [kind, id]);
  async function toggle() { if (authenticated === false) { window.location.href = "/login"; return; } if (saving) return; setSaving(true); try { const response = await fetch("/api/auth/favorites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id }) }); if (response.status === 401) { window.location.href = "/login"; return; } const data = await response.json() as { favorite?: boolean; error?: string }; if (!response.ok) throw new Error(data.error || "更新できませんでした"); setAuthenticated(true); setFavorite(Boolean(data.favorite)); invalidateFavoritesCache(); window.dispatchEvent(new Event("cosfind-favorites-updated")); } catch (error) { alert(error instanceof Error ? error.message : "更新できませんでした"); } finally { setSaving(false); } }
  return <button type="button" className={`favorite-button${favorite ? " active" : ""}${compact ? " compact" : ""}`} aria-pressed={favorite} disabled={saving} onClick={() => void toggle()}>{favorite ? "★" : "☆"} {saving ? "更新中…" : favorite ? "お気に入り済み" : "お気に入り"}</button>;
}
