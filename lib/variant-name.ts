export function formatVariantName(variant: { name: string; colorCode?: string | null }) {
  const name = variant.name.trim();
  const colorCode = variant.colorCode?.trim();
  if (!name) return colorCode || "バリエーション名なし";
  if (!colorCode || name.includes(colorCode)) return name;
  return `${colorCode} ${name}`;
}
