import { NextResponse } from "next/server";
import { clientAddress, consumeRateLimit } from "@/lib/server/security";

type NominatimResult = { lat: string; lon: string; display_name?: string };

function normalizeJapaneseAddress(value: string) {
  return value
    .normalize("NFKC")
    .replace(/〒?\s*\d{3}[-ー−‐‑–—―]?\d{4}\s*/g, "")
    .replace(/[ー−‐‑–—―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function addressCandidates(value: string) {
  const normalized = normalizeJapaneseAddress(value);
  const candidates = [normalized];
  const beforeWhitespace = normalized.split(" ")[0]?.trim();
  const withoutBuilding = normalized
    .replace(/(?:ビル(?:ディング)?|マンション|ハイツ|コーポ|タワー|レジデンス|アパート|[0-9]+(?:階|F))\s*.*$/i, "")
    .trim();
  const administrativeEnd = Math.max(...["市", "区", "町", "村"].map((suffix) => withoutBuilding.lastIndexOf(suffix) + 1));
  const townLevel = administrativeEnd > 0
    ? `${withoutBuilding.slice(0, administrativeEnd)}${withoutBuilding.slice(administrativeEnd).replace(/[0-9]+(?:-[0-9]+)*(?:番地?|号)?\s*.*$/, "")}`.trim()
    : withoutBuilding;
  for (const candidate of [beforeWhitespace, withoutBuilding, townLevel]) {
    if (candidate && candidate.length >= 4 && !candidates.includes(candidate)) candidates.push(candidate);
  }
  return candidates;
}

async function searchNominatim(address: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "jp");
  const response = await fetch(url, { headers: { "Accept-Language": "ja", "User-Agent": "CosFind-MVP/0.1 (address geocoding)" }, next: { revalidate: 86400 } });
  if (!response.ok) throw new Error("geocode service unavailable");
  const [result] = await response.json() as NominatimResult[];
  return result;
}

export async function GET(request: Request) {
  const rate = await consumeRateLimit(`geocode:${clientAddress(request)}`, 180, 60 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "住所検索が多すぎます。時間をおいて再試行してください" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const address = new URL(request.url).searchParams.get("address")?.trim();
  if (!address || address.length < 4 || address.length > 250) return NextResponse.json({ error: "住所を4～250文字で入力してください" }, { status: 400 });
  try {
    const candidates = addressCandidates(address);
    for (let index = 0; index < candidates.length; index += 1) {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1_050));
      const candidate = candidates[index];
      const result = await searchNominatim(candidate);
      if (!result) continue;
      return NextResponse.json({
        latitude: Number(result.lat),
        longitude: Number(result.lon),
        matchedAddress: result.display_name,
        matchedQuery: candidate,
        precision: index === 0 ? "full" : candidate.match(/[0-9]/) ? "street" : "town",
      });
    }
    return NextResponse.json({});
  } catch { return NextResponse.json({ error: "住所検索に失敗しました" }, { status: 502 }); }
}
