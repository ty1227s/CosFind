export type ProductRegistrationRequest = { id: string; createdAt: string; brand: string; name: string; category: string; janCode: string; pa?: "+" | "++" | "+++" | "++++" | ""; variantName: string; colorCode: string; variantJanCode: string; status: "pending"; submittedByUserId?: string; reportStoreId?: string; reportStoreName?: string; reportStatus?: "available" | "sold_out"; reportMethod?: string; reportComment?: string; reportReportedAt?: string };
export type StoreRegistrationRequest = { id: string; createdAt: string; name: string; chain: string; type: string; address: string; latitude: number; longitude: number; status: "pending" };

export const REQUEST_KEYS = { products: "cosfind_product_requests_v1", stores: "cosfind_store_requests_v1" } as const;

export function readRequests<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { const value = JSON.parse(localStorage.getItem(key) || "[]") as T[]; return Array.isArray(value) ? value : []; } catch { return []; }
}

export function addRequest<T>(key: string, request: T) {
  const requests = readRequests<T>(key); localStorage.setItem(key, JSON.stringify([request, ...requests]));
  invalidateClientResource("auth:history:");
  invalidateClientResource("auth:profile");
  window.dispatchEvent(new Event("cosfind-requests-updated"));
}
import { invalidateClientResource } from "@/lib/client-resource-cache";

