export const PRODUCT_MEDIA_TYPES = ["instagram", "youtube", "x", "magazine", "web", "other"] as const;

export type ProductMediaType = (typeof PRODUCT_MEDIA_TYPES)[number];

export type ProductMediaMention = {
  id: string;
  mediaType: ProductMediaType;
  sourceName: string;
  title: string;
  url: string;
  publishedOn: string;
  note: string;
};

export const PRODUCT_MEDIA_TYPE_LABELS: Record<ProductMediaType, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X",
  magazine: "雑誌",
  web: "Web記事",
  other: "その他",
};

export function isProductMediaType(value: unknown): value is ProductMediaType {
  return typeof value === "string" && PRODUCT_MEDIA_TYPES.includes(value as ProductMediaType);
}

export function normalizeProductMediaUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function formatProductMediaDate(value: string) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("ja-JP") : "日付未登録";
}
