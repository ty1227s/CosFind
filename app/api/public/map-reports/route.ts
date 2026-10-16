import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 500;

export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !publishableKey) return NextResponse.json({ error: "在庫報告を取得できませんでした" }, { status: 503 });

  const url = new URL("/rest/v1/public_stock_summaries", baseUrl);
  const requestedOffset = Number(new URL(request.url).searchParams.get("offset") ?? "0");
  const offset = Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0;
  url.searchParams.set("select", "store_id,last_reported_at,report_count");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(PAGE_SIZE));
  const upstream = await fetch(url, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "在庫報告を取得できませんでした" }, { status: 502 });
  return new Response(upstream.body, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15", "X-CosFind-Page-Size": String(PAGE_SIZE) },
  });
}
