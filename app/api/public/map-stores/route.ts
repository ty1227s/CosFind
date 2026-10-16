import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 500;

export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !publishableKey) return NextResponse.json({ error: "店舗情報を取得できませんでした" }, { status: 503 });

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const url = new URL("/rest/v1/stores", baseUrl);
  const requestedOffset = Number(new URL(request.url).searchParams.get("offset") ?? "0");
  const offset = Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0;
  url.searchParams.set("select", "id,name,chain_name,store_type,address,latitude,longitude,created_at,opening_date,closing_date");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.append("or", `(opening_date.is.null,opening_date.lte.${today})`);
  url.searchParams.append("or", `(closing_date.is.null,closing_date.gte.${today})`);

  const upstream = await fetch(url, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "店舗情報を取得できませんでした" }, { status: 502 });
  return new Response(upstream.body, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15", "X-CosFind-Page-Size": String(PAGE_SIZE) },
  });
}
