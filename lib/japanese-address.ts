import { PREFECTURES, type Prefecture } from "@/lib/prefectures";

export function normalizeJapaneseAddress(address: string) {
  return address.replace(/^[〒\s　]*\d{3}-?\d{4}[\s　]*/, "").replace(/[\s　]+/g, "").trim();
}

export function prefectureFromAddress(address: string): Prefecture | "" {
  const normalized = normalizeJapaneseAddress(address);
  return PREFECTURES.find((prefecture) => normalized.startsWith(prefecture)) ?? "";
}

export function addressIsInPrefecture(address: string, prefecture: string) {
  return Boolean(prefecture) && prefectureFromAddress(address) === prefecture;
}

export function addressIsInMunicipality(address: string, prefecture: string, municipality: string) {
  if (!prefecture || !municipality || !addressIsInPrefecture(address, prefecture)) return false;
  return normalizeJapaneseAddress(address).startsWith(`${prefecture}${municipality}`);
}
