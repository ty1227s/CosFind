import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { FavoriteButton } from "@/components/favorite-button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVariantName } from "@/lib/variant-name";
import { formatStoreName } from "@/lib/store-name";
import { ProductDetailMap, type ProductMapStore } from "@/components/product-detail-map";
import { operatingPeriodQuery } from "@/lib/store-operating-period";

export const dynamic = "force-dynamic";
type ProductRow = { id: string; name: string; category: string; additional_categories:string[]|null; jan_code: string | null; additional_jan_codes:string[]|null; spf:number|null; pa:string|null; brands: { id:string;name: string } | { id:string;name: string }[] | null; product_variants: { id: string; variant_name: string; color_code: string | null; jan_code: string | null; release_date:string|null }[] };
type ReportRow = { store_id: string; reported_at: string; stores: { id: string; name: string; chain_name: string | null; address: string } | null };
type StoreRow = { id:string;name:string;chain_name:string|null;address:string;latitude:number;longitude:number;opening_date:string|null;closing_date:string|null };
type StoreMetadataRow = { payload: { storeId?:unknown; customName?:unknown } };
type MapReportRow = { store_id:string;status:"available"|"low_stock"|"sold_out"|"unknown"|"discontinued";reported_at:string };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
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
  return <><SiteHeader/><main className="detail"><p className="eyebrow">{[product.category,...(product.additional_categories??[])].join(" / ")}</p><h1>{product.name}</h1><p className="lead">{brand&&<Link className="product-brand-link" href={`/brands/detail/${brand.id}`}>{brand.name}</Link>}{brand&&productMeta&&" ・ "}{productMeta}</p><FavoriteButton kind="product" id={product.id}/><section><h2>カラー / 色番 / バリエーション</h2><div className="variant-grid">{product.product_variants.map((variant) => <div key={variant.id}><b>{formatVariantName({ name: variant.variant_name, colorCode: variant.color_code ?? "" })}</b><small>色番 {variant.color_code || "—"}{variant.jan_code ? ` ・ JAN ${variant.jan_code}` : ""}</small>{variant.release_date&&<small className="variant-release-date">発売日 {new Date(`${variant.release_date}T00:00:00`).toLocaleDateString("ja-JP")}</small>}</div>)}</div></section><section><h2>店舗別の報告状況</h2><ProductDetailMap stores={mapStores}/></section><section><h2>報告されている店舗 <em>{stores.length}</em></h2>{stores.length ? stores.map((report) => { const store = report.stores!; return <Link className="detail-row" href={`/stores/${store.id}`} key={store.id}><span><b>{formatStoreName({ name: store.name, chain: store.chain_name ?? "", customName:customNames.get(store.id)===true })}</b><small>{store.address}</small></span><span>最終情報 {new Date(report.reported_at).toLocaleDateString("ja-JP")} ›</span></Link>; }) : <div className="empty-state"><b>この商品の在庫報告はまだありません</b><p>店舗で見つけたら情報提供をお願いします。</p></div>}</section></main></>;
}
