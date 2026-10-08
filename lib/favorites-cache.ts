import { getClientResource, invalidateClientResource } from "@/lib/client-resource-cache";

export type FavoriteProduct = { id: string; name: string; brand: string; category: string; additionalCategories: string[]; variants: { name: string; colorCode: string }[] };
export type FavoriteStore = { id: string; name: string; chain: string; customName?: boolean; address: string };
export type FavoritesData = { productIds: string[]; storeIds: string[]; products: FavoriteProduct[]; stores: FavoriteStore[] };

export class FavoritesRequestError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export function getFavorites(force = false) {
  return getClientResource<FavoritesData>("auth:favorites", async () => {
    const response = await fetch("/api/auth/favorites", { cache: "no-store" });
    const data = await response.json() as FavoritesData & { error?: string };
    if (!response.ok) throw new FavoritesRequestError(data.error || "お気に入りを読み込めませんでした", response.status);
    return data;
  }, force);
}

export function invalidateFavoritesCache() { invalidateClientResource("auth:favorites"); }
