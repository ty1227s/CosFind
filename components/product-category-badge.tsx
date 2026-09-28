import { PRODUCT_CATEGORY_GROUPS } from "@/lib/product-categories";

const groupTones = {
  "メイクアップ": "cosmetics",
  "スキンケア": "skincare",
  "UVケア": "uv",
  "ネイル": "nail",
  "ボディ・ハンドケア": "tools",
  "フレグランス": "tools",
  "美容ツール": "tools",
} as const;

const categoryTones = new Map<string, string>(
  PRODUCT_CATEGORY_GROUPS.flatMap((group) => group.categories.map((category) => [category, groupTones[group.label]] as const)),
);

export function productCategoryTone(category: string) {
  return groupTones[category as keyof typeof groupTones] ?? categoryTones.get(category) ?? "tools";
}

export function ProductCategoryBadge({ category }: { category: string }) {
  if (!category) return null;
  return <span className={`product-category-badge ${productCategoryTone(category)}`}>{category}</span>;
}

export function ProductCategoryBadges({ categories, className = "" }: { categories: string[]; className?: string }) {
  const values = [...new Set(categories.filter(Boolean))];
  if (!values.length) return null;
  return <span className={`product-category-badges${className ? ` ${className}` : ""}`}>
    {values.map((category) => <ProductCategoryBadge category={category} key={category}/>)}
  </span>;
}
