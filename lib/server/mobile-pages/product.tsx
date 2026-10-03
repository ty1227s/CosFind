import "server-only";
import {notFound} from "next/navigation";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {type ProductMapStore} from "@/components/product-detail-map";
import {operatingPeriodQuery} from "@/lib/store-operating-period";
type ProductRow = { id: string; name: string; category: string; additional_categories:string[]|null; jan_code: string | null; additional_jan_codes:string[]|null; spf:number|null; pa:string|null; brands: { id:string;name: string } | { id:string;name: string }[] | null; product_variants: { id: string; variant_name: string; color_code: string | null; jan_code: string | null; release_date:string|null }[] };
type ReportRow = { store_id: string; reported_at: string; stores: { id: string; name: string; chain_name: string | null; address: string } | null };
type StoreRow = { id:string;name:string;chain_name:string|null;address:string;latitude:number;longitude:number;opening_date:string|null;closing_date:string|null };
type StoreMetadataRow = { payload: { storeId?:unknown; customName?:unknown } };
type MapReportRow = { store_id:string;status:"available"|"low_stock"|"sold_out"|"unknown"|"discontinued";reported_at:string };
export async function loadPage({ params }: { params: Promise<{ id: string }> }){
  const { id } = await params; const db = createSupabaseAdminClient();
  const productResult = await db.from("products").select("id,name,category,additional_categories,jan_code,additional_jan_codes,spf,pa,brands(id,name),product_variants(id,variant_name,color_code,jan_code,release_date)").eq("id", id).eq("is_active", true).order("created_at", { referencedTable: "product_variants" }).maybeSingle();
  if (productResult.error || !productResult.data) notFound();
  const product = productResult.data as unknown as ProductRow; const brand = Array.isArray(product.brands) ? product.brands[0] ?? null : product.brands;
  const [reportsResult, allStoresResult, mapReportsResult, metadataResult] = await Promise.all([
    db.from("stock_reports").select("store_id,reported_at,stores(id,name,chain_name,address)").eq("product_id", id).eq("status", "available").order("reported_at", { ascending: false }).limit(50),
    operatingPeriodQuery(db.from("stores").select("id,name,chain_name,address,latitude,longitude,opening_date,closing_date").eq("is_active", true)).order("name"),
    db.from("stock_reports").select("store_id,status,reported_at").eq("product_id", id).order("reported_at", { ascending: false }).limit(10000),
    db.from("store_requests").select("payload,created_at").eq("status", "metadata").order("created_at", { ascending: true }),
  ]);
  const visibleStoreIds=new Set((allStoresResult.data??[]).map(store=>store.id));
  const seen = new Set<string>(); const stores = ((reportsResult.data ?? []) as unknown as ReportRow[]).filter((report) => visibleStoreIds.has(report.store_id)&&report.stores && !seen.has(report.store_id) && seen.add(report.store_id));
  const latestByStore = new Map<string, MapReportRow>();
  for (const report of (mapReportsResult.data ?? []) as MapReportRow[]) if (!latestByStore.has(report.store_id)) latestByStore.set(report.store_id, report);
  const customNames = new Map<string, boolean>();
  for (const row of (metadataResult.data ?? []) as unknown as StoreMetadataRow[]) { const storeId=row.payload?.storeId;if(typeof storeId==="string"&&typeof row.payload.customName==="boolean")customNames.set(storeId,row.payload.customName); }
  const mapStores: ProductMapStore[] = ((allStoresResult.data ?? []) as StoreRow[]).map((store) => { const latest = latestByStore.get(store.id); const reportStatus = !latest || latest.status === "unknown" ? "unreported" : latest.status === "available" || latest.status === "low_stock" ? "available" : "unavailable"; return { id:store.id,name:store.name,chain:store.chain_name??"",customName:customNames.get(store.id)===true,address:store.address,latitude:store.latitude,longitude:store.longitude,reportStatus,lastReportedAt:latest?.reported_at??null }; });
  const productJans=[product.jan_code,...(product.additional_jan_codes??[])].filter((jan):jan is string=>Boolean(jan));
  const productMeta=[product.spf==null?"":`SPF ${product.spf}`,product.pa?`PA${product.pa}`:"",productJans.length?`JAN ${productJans.join(" / ")}`:""].filter(Boolean).join(" ・ ");
  const customNameFlags = Object.fromEntries(customNames);
  return {id,product,brand,stores,mapStores,productMeta,customNameFlags};
}
