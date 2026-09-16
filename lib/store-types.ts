export const STORE_TYPES = [
  "ドラッグストア",
  "ホームセンター",
  "バラエティショップ（総合）",
  "バラエティショップ（女性向け）",
  "総合スーパー",
  "スーパー",
  "家電量販店",
  "ディスカウントストア",
  "その他一般流通コスメ販売店",
] as const;

export function normalizeStoreType(type: string) {
  return type === "バラエティショップ" ? "バラエティショップ（総合）" : type;
}
