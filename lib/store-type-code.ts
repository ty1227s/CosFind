const STORE_TYPE_CODES: Readonly<Record<string, string>> = {
  "バラエティショップ（総合）": "B",
  "バラエティショップ": "B",
  "バラエティショップ（女性向け）": "BW",
  "ドラッグストア": "DS",
  "ホームセンター": "HC",
  "総合スーパー": "CS",
  "スーパー": "S",
  "家電量販店": "HA",
  "ディスカウントストア": "DC",
  "その他": "OT",
};

export function getStoreTypeCode(type: string): string {
  return STORE_TYPE_CODES[type] ?? "OT";
}
