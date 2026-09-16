export type Category = "ファンデーション" | "化粧下地" | "シェーディング" | "アイシャドウ" | "マスカラ" | "チーク" | "リップ" | "化粧水" | "乳液" | "美容液" | "フェイスマスク" | "日焼け止め" | "ネイルカラー" | "ツール";
export interface Variant { id: string; name: string; colorCode?: string; janCode: string; releaseDate?: string; }
export type PaRating = "+" | "++" | "+++" | "++++";
export interface Product { id: string; brand: string; name: string; category: Category; janCode: string; releaseDate?: string; spf?: number | null; pa?: PaRating | null; createdAt?: string; variants: Variant[]; }
export interface Store { id: string; name: string; chain: string; type: string; address: string; latitude: number; longitude: number; customName?: boolean; openingDate?: string; closingDate?: string; }
export type StoreBusinessHours = Record<string, { openingTime: string; closingTime: string; closed: boolean }>;
export interface StoreResult extends Store { lastReportedAt: string; variants: string[]; reportCount: number; distanceKm: number; businessHours?: StoreBusinessHours; }
