export type StoreTypeColor = { background: string; foreground: string };
export const STORE_TYPE_LEGEND = ["バラエティショップ", "ドラッグストア", "ホームセンター", "総合スーパー", "スーパー", "家電量販店", "ディスカウントストア", "その他"] as const;

export function getStoreTypeColor(type: string): StoreTypeColor {
  if (type === "バラエティショップ（総合）" || type === "バラエティショップ（女性向け）" || type === "バラエティショップ") return { background: "#f2c94c", foreground: "#332800" };
  if (type === "ドラッグストア") return { background: "#239b62", foreground: "#ffffff" };
  if (type === "ホームセンター") return { background: "#2878d0", foreground: "#ffffff" };
  if (type === "総合スーパー") return { background: "#8250b5", foreground: "#ffffff" };
  if (type === "スーパー") return { background: "#d64545", foreground: "#ffffff" };
  if (type === "家電量販店") return { background: "#38aee0", foreground: "#ffffff" };
  if (type === "ディスカウントストア") return { background: "#8a5a35", foreground: "#ffffff" };
  return { background: "#85888c", foreground: "#ffffff" };
}
