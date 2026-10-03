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

export function isRailwayRegion(value: string): value is RailwayRegion {
  return (RAILWAY_REGIONS as readonly string[]).includes(value);
}
