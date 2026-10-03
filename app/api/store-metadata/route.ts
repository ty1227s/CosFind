import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { clientAddress, consumeRateLimit } from "@/lib/server/security";
import { UUID_PATTERN } from "@/lib/server/validation";
import { operatingPeriodQuery } from "@/lib/store-operating-period";
import { readLatestCatalogMetadata } from "@/lib/server/catalog-metadata";

export async function GET(request: Request) {
  const rate = await consumeRateLimit(`store-metadata:${clientAddress(request)}`, 120, 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "リクエストが多すぎます" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const ids = new URL(request.url).searchParams.get("ids")?.split(",").filter((id) => UUID_PATTERN.test(id)).slice(0, 500) ?? [];
  if (!ids.length) return NextResponse.json({ stores: {} });
  const db=createSupabaseAdminClient();
  const visibleResult=await operatingPeriodQuery(db.from("stores").select("id").in("id",ids).eq("is_active",true));
  if(visibleResult.error)return NextResponse.json({error:"店舗情報を取得できませんでした"},{status:500});
  const requested = new Set((visibleResult.data??[]).map(store=>store.id));
  if(!requested.size)return NextResponse.json({stores:{}});
  let metadataRows;
  try { metadataRows=await readLatestCatalogMetadata(db,["store_provisional_brands"],false,[...requested]); }
  catch { return NextResponse.json({error:"店舗付加情報を取得できませんでした"},{status:500}); }
  const stores: Record<string, { businessHours: unknown; customName: boolean; stationNames: string[] }> = {};
  for (const row of metadataRows) {
    const payload = row.payload as { storeId?: unknown; businessHours?: unknown; customName?: unknown; stationNames?: unknown };
    if (typeof payload.storeId === "string" && requested.has(payload.storeId)) {
      const previous = stores[payload.storeId] ?? { businessHours: {}, customName: false, stationNames: [] };
      stores[payload.storeId] = {
        businessHours: payload.businessHours && typeof payload.businessHours === "object" ? payload.businessHours : previous.businessHours,
        customName: typeof payload.customName === "boolean" ? payload.customName : previous.customName,
        stationNames: Array.isArray(payload.stationNames) ? payload.stationNames.filter((name): name is string => typeof name === "string") : previous.stationNames,
      };
    }
  }
  return NextResponse.json({ stores }, { headers: { "Cache-Control": "private, max-age=3, stale-while-revalidate=10" } });
}
