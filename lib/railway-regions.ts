export const RAILWAY_REGIONS = [
  "北海道",
  "東北",
  "首都圏",
  "信越",
  "北陸",
  "東海",
  "関西",
  "中国",
  "四国",
  "九州",
  "沖縄",
] as const;

export type RailwayRegion = (typeof RAILWAY_REGIONS)[number];

export const RAILWAY_REGION_PREFECTURES: Record<RailwayRegion, readonly string[]> = {
  北海道: ["北海道"],
  東北: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
  首都圏: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県", "山梨県"],
  信越: ["新潟県", "長野県"],
  北陸: ["富山県", "石川県", "福井県"],
  東海: ["岐阜県", "静岡県", "愛知県", "三重県"],
  関西: ["滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"],
  中国: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"],
  四国: ["徳島県", "香川県", "愛媛県", "高知県"],
  九州: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県"],
  沖縄: ["沖縄県"],
};

export function isRailwayRegion(value: string): value is RailwayRegion {
  return (RAILWAY_REGIONS as readonly string[]).includes(value);
}

export function isPrefectureInRailwayRegion(prefecture: string, region: string) {
  return isRailwayRegion(region) && RAILWAY_REGION_PREFECTURES[region].includes(prefecture);
}
