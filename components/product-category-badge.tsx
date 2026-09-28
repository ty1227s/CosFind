import { PRODUCT_CATEGORY_GROUPS } from "@/lib/product-categories";

const skincareCategories = new Set<string>(
  PRODUCT_CATEGORY_GROUPS.find((group) => group.label === "スキンケア")?.categories ?? [],
);

export function productCategoryTone(category: string) {
  return skincareCategories.has(category) ? "skincare" : "cosmetics";
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
