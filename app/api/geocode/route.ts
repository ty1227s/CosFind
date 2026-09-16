import { NextResponse } from "next/server";
import { clientAddress, consumeRateLimit } from "@/lib/server/security";

type NominatimResult = { lat: string; lon: string };

export async function GET(request: Request) {
  const rate = await consumeRateLimit(`geocode:${clientAddress(request)}`, 30, 60 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "住所検索が多すぎます。時間をおいて再試行してください" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const address = new URL(request.url).searchParams.get("address")?.trim();
  if (!address || address.length < 4 || address.length > 250) return NextResponse.json({ error: "住所を4～250文字で入力してください" }, { status: 400 });
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "jp");
  try {
    const response = await fetch(url, { headers: { "Accept-Language": "ja", "User-Agent": "CosFind-MVP/0.1" }, next: { revalidate: 86400 } });
    if (!response.ok) return NextResponse.json({ error: "住所検索サービスに接続できません" }, { status: 502 });
    const [result] = await response.json() as NominatimResult[];
    if (!result) return NextResponse.json({});
    return NextResponse.json({ latitude: Number(result.lat), longitude: Number(result.lon) });
  } catch { return NextResponse.json({ error: "住所検索に失敗しました" }, { status: 502 }); }
}
