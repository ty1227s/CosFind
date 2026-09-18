import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatStoreName } from "@/lib/store-name";
import { StoreDetailMap } from "@/components/store-detail-map";
import { FavoriteButton } from "@/components/favorite-button";
import { StoreProductList, type StoreProductItem } from "@/components/store-product-list";
import { AuthenticatedOnly } from "@/components/authenticated-only";
import { StoreBrandReportForm } from "@/components/store-brand-report-form";
import { formatStoreHoursRange } from "@/lib/store-hours";
import { getStoreTypeColor } from "@/lib/store-type-color";
import { getStoreTypeCode } from "@/lib/store-type-code";
import { isStorePubliclyVisible } from "@/lib/store-operating-period";

export const dynamic = "force-dynamic";
type Store = { id:string;name:string;chain:string;type:string;address:string;latitude:number;longitude:number;openingDate?:string;closingDate?:string;customName?:boolean };
type ReportRow = { product_id:string;reported_at:string;products:{id:string;name:string;category:string;brands:{name:string}|{name:string}[]|null}|null };
type MetadataPayload = { metadataType?:unknown;brandIds?:unknown;brandId?:unknown;openingTime?:unknown;closingTime?:unknown;businessHours?:unknown;customName?:unknown };
const WEEKDAYS=[{key:"mon",label:"月"},{key:"tue",label:"火"},{key:"wed",label:"水"},{key:"thu",label:"木"},{key:"fri",label:"金"},{key:"sat",label:"土"},{key:"sun",label:"日"}];

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  let storeResult = await db.from("stores").select("id,name,chain_name,store_type,address,latitude,longitude,opening_date,closing_date").eq("id", id).eq("is_active", true).maybeSingle();
  for (let attempt=0;storeResult.error&&attempt<2;attempt+=1) { await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));storeResult=await db.from("stores").select("id,name,chain_name,store_type,address,latitude,longitude,opening_date,closing_date").eq("id",id).eq("is_active",true).maybeSingle(); }
  if (storeResult.error) return <><SiteHeader/><main className="detail"><p className="eyebrow">STORE</p><h1>店舗情報を読み込めませんでした</h1><p className="lead">通信が一時的に不安定な可能性があります。少し待ってから、もう一度お試しください。</p><div className="detail-primary-actions"><Link className="detail-report-button" href={`/stores/${encodeURIComponent(id)}`}>再読み込み</Link><Link className="google-maps-link" href="/map">地図へ戻る</Link></div></main></>;
  if (!storeResult.data || !isStorePubliclyVisible({openingDate:storeResult.data.opening_date,closingDate:storeResult.data.closing_date})) notFound();
  const row=storeResult.data;
  const store:Store={id:row.id,name:row.name,chain:row.chain_name??"",type:row.store_type,address:row.address,latitude:row.latitude,longitude:row.longitude,openingDate:row.opening_date??undefined,closingDate:row.closing_date??undefined};
  const metadataResult=await db.from("store_requests").select("payload,created_at").eq("status","metadata").contains("payload",{storeId:id}).order("created_at",{ascending:false});
  const metadataPayloads=(metadataResult.data??[]).map(item=>item.payload as MetadataPayload);
  store.customName=metadataPayloads.find(payload=>typeof payload.customName==="boolean")?.customName===true;
  const businessMetadata=metadataPayloads.find(payload=>payload.businessHours&&typeof payload.businessHours==="object")??metadataPayloads[0];
  const openingTime=typeof businessMetadata?.openingTime==="string"?businessMetadata.openingTime:"";
  const closingTime=typeof businessMetadata?.closingTime==="string"?businessMetadata.closingTime:"";
  const businessHours=businessMetadata?.businessHours&&typeof businessMetadata.businessHours==="object"?businessMetadata.businessHours as Record<string,{openingTime?:string;closingTime?:string;closed?:boolean}>:{};
  const weeklyHours=WEEKDAYS.map(({key,label})=>{const hours=businessHours[key];return{key,label,openingTime:hours?.openingTime||"",closingTime:hours?.closingTime||"",closed:hours?.closed===true}});
  const hasWeeklyHours=weeklyHours.some(hours=>hours.closed||hours.openingTime||hours.closingTime);
  const managedBrandIds=metadataPayloads.find(payload=>payload.metadataType==="store_provisional_brands"&&Array.isArray(payload.brandIds))?.brandIds;
  const brandIds=[...new Set([...(Array.isArray(managedBrandIds)?managedBrandIds.filter((value):value is string=>typeof value==="string"):[]),...metadataPayloads.flatMap(payload=>typeof payload.brandId==="string"?[payload.brandId]:[])])];
  const directBrandsResult=brandIds.length?await db.from("brands").select("name").in("id",brandIds):{data:[] as {name:string}[]};
  const directBrands=(directBrandsResult.data??[]).map(brand=>brand.name);
  const reportsResult=await db.from("stock_reports").select("product_id,reported_at,products(id,name,category,brands(name))").eq("store_id",id).eq("status","available").order("reported_at",{ascending:false}).limit(200);
  const reports=(reportsResult.data??[]) as unknown as ReportRow[];
  const seen=new Set<string>();
  const recent=reports.filter(report=>report.products&&!seen.has(report.product_id)&&seen.add(report.product_id)).slice(0,10);
  const stockBrands=reports.flatMap(report=>{const brands=report.products?.brands;const name=Array.isArray(brands)?brands[0]?.name:brands?.name;return name?[name]:[]});
  const reportedBrands=[...new Set([...directBrands,...stockBrands])].sort((a,b)=>a.localeCompare(b,"ja")).slice(0,15);
  const allBrandsResult=await db.from("brands").select("id,name").order("name");
  const allBrands=(allBrandsResult.data??[]) as {id:string;name:string}[];
  const productItems:StoreProductItem[]=recent.map(report=>{const product=report.products!;return{id:product.id,name:product.name,brand:Array.isArray(product.brands)?product.brands[0]?.name??"":product.brands?.name??"",category:product.category,reportedAt:report.reported_at}});
  const googleMapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.latitude},${store.longitude}`)}`;
  const storeTypeColor=getStoreTypeColor(store.type);

  return <><SiteHeader/><main className="detail">
    <p className="store-detail-type-name">{store.type}</p><div className="store-detail-title"><h1>{formatStoreName(store)}</h1><i style={{backgroundColor:storeTypeColor.background,color:storeTypeColor.foreground}}>{getStoreTypeCode(store.type)}</i></div><p className="lead">{store.address||"住所情報なし"}</p>
    {hasWeeklyHours?<div className="store-weekly-hours"><b>営業時間</b><dl>{weeklyHours.map(hours=><div key={hours.key}><dt>{hours.label}</dt><dd>{hours.closed?"定休日":hours.openingTime||hours.closingTime?formatStoreHoursRange(hours.openingTime,hours.closingTime):"未登録"}</dd></div>)}</dl></div>:(openingTime||closingTime)&&<p className="store-business-hours"><b>営業時間</b><span>{formatStoreHoursRange(openingTime,closingTime)}</span></p>}
    <div className="detail-primary-actions"><FavoriteButton kind="store" id={store.id}/><a className="google-maps-link" href={googleMapsUrl} target="_blank" rel="noopener noreferrer">Googleマップで開く ↗</a><AuthenticatedOnly><Link className="detail-report-button" href={`/report?store=${store.id}`}>✦ この店舗で見つけた商品を報告</Link></AuthenticatedOnly></div>
    <aside className="store-listing-notice" aria-labelledby="store-listing-notice-title"><h2 id="store-listing-notice-title">掲載情報に関するお願い</h2><p>本ページには、CosFind利用者から寄せられた情報が含まれており、当該店舗またはその運営会社が作成、確認もしくは保証したものではありません。</p><p><strong>掲載内容の確認、訂正、削除その他本ページに関するお問い合わせや苦情を、店舗またはその運営会社へ直接行うことはお控えください。</strong>掲載情報に関するご連絡は、CosFind運営者へお寄せくださいますようお願いいたします。</p></aside>
    <StoreDetailMap latitude={store.latitude} longitude={store.longitude} name={formatStoreName(store)} type={store.type}/>
    {reportedBrands.length>0&&<section><h2>報告があったブランド</h2><div className="reported-brands"><div>{reportedBrands.map(name=><span key={name}>{name}</span>)}</div></div></section>}
    <AuthenticatedOnly><StoreBrandReportForm storeId={store.id} brands={allBrands} reportedBrandNames={reportedBrands}/></AuthenticatedOnly>
    <section><h2>この店舗で最近報告された商品</h2><StoreProductList items={productItems}/></section>
  </main></>;
}
