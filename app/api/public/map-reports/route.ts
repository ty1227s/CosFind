import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !publishableKey) return NextResponse.json({ error: "在庫報告を取得できませんでした" }, { status: 503 });

  const url = new URL("/rest/v1/public_stock_summaries", baseUrl);
  url.searchParams.set("select", "store_id,last_reported_at,report_count");
  url.searchParams.set("limit", "5000");
  const upstream = await fetch(url, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "在庫報告を取得できませんでした" }, { status: 502 });
  return new Response(upstream.body, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" },
  });
}
