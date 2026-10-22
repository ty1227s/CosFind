import type { PRODUCT_CATEGORIES } from "@/lib/product-categories";
import type { ProductMediaMention } from "@/lib/product-media";

export type Category = (typeof PRODUCT_CATEGORIES)[number];
export interface Variant { id: string; name: string; colorCode?: string; janCode: string; releaseDate?: string; }
export type PaRating = "+" | "++" | "+++" | "++++";
export interface Product { id: string; brand: string; name: string; category: Category; additionalCategories?: string[]; janCode: string; additionalJanCodes?: string[]; releaseDate?: string; spf?: number | null; pa?: PaRating | null; createdAt?: string; variants: Variant[]; mediaMentions?: ProductMediaMention[]; }
export interface Store { id: string; name: string; chain: string; type: string; address: string; latitude: number; longitude: number; customName?: boolean; stationNames?: string[]; openingDate?: string; closingDate?: string; }
export type StoreBusinessPeriod = { openingTime: string; closingTime: string };
export type StoreBusinessDay = { openingTime: string; closingTime: string; periods?: StoreBusinessPeriod[]; closed: boolean };
export type StoreBusinessHours = Record<string, StoreBusinessDay>;
export interface StoreResult extends Store { lastReportedAt: string; variants: string[]; reportCount: number; distanceKm: number; businessHours?: StoreBusinessHours; }
