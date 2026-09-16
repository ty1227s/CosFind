export function getStoreTypeIcon(type: string): string | null {
  if (type === "ドラッグストア") return "/store-icons/drugstore.png";
  if (type === "バラエティショップ（女性向け）") return "/store-icons/variety-women.png";
  return null;
}
