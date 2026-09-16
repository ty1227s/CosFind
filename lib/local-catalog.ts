import type { Product, StoreResult } from "@/types/domain";
import { products as seedProducts, stores as seedStores } from "@/lib/mock-data";
import { normalizeStoreType } from "@/lib/store-types";

export const LOCAL_CATALOG_KEYS = { products: "cosfind_admin_products_v1", stores: "cosfind_admin_stores_v1" } as const;

export function calculateDistanceKm(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(fromLatitude)) * Math.cos(radians(toLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function readLocalCatalog(): { products: Product[]; stores: StoreResult[] } {
  if (typeof window === "undefined") return { products: seedProducts, stores: seedStores };
  try {
    const products = JSON.parse(localStorage.getItem(LOCAL_CATALOG_KEYS.products) || "null") as Product[] | null;
    const stores = JSON.parse(localStorage.getItem(LOCAL_CATALOG_KEYS.stores) || "null") as StoreResult[] | null;
    return {
      products: Array.isArray(products) ? products : seedProducts,
      stores: Array.isArray(stores) ? stores.map((store) => ({ ...store, type: normalizeStoreType(store.type), lastReportedAt: store.lastReportedAt || new Date(0).toISOString(), variants: store.variants || [], reportCount: store.reportCount || 0, distanceKm: calculateDistanceKm(35.6896, 139.7006, store.latitude, store.longitude) })) : seedStores,
    };
  } catch { return { products: seedProducts, stores: seedStores }; }
}
