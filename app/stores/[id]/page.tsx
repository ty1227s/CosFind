import type {Metadata} from "next";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {formatStoreName} from "@/lib/store-name";
import {isStorePubliclyVisible} from "@/lib/store-operating-period";
import {publicSiteOrigin} from "@/lib/area-directory";
import {isDemoStore} from "@/lib/demo-data";
import {isAuthenticatedAdmin} from "@/lib/server/security";
export const dynamic = "force-dynamic";
type MetadataPayload = { metadataType?:unknown;brandIds?:unknown;brandId?:unknown;openingTime?:unknown;closingTime?:unknown;businessHours?:unknown;customName?:unknown;stationNames?:unknown };
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const [storeResult, metadataResult] = await Promise.all([
    db.from("stores").select("id,name,chain_name,store_type,address,opening_date,closing_date").eq("id",id).eq("is_active",true).maybeSingle(),
    db.from("store_requests").select("payload,created_at").eq("status","metadata").contains("payload",{storeId:id}).order("created_at",{ascending:false}),
  ]);
  const row=storeResult.data;
  if(!row||!isStorePubliclyVisible({openingDate:row.opening_date,closingDate:row.closing_date})||(isDemoStore(row)&&!(await isAuthenticatedAdmin())))return{title:"店舗が見つかりません | CosFind",robots:{index:false,follow:false}};
  const payloads=(metadataResult.data??[]).map(item=>item.payload as MetadataPayload);
  const customName=payloads.find(payload=>typeof payload.customName==="boolean")?.customName===true;
  const stationNames=payloads.find(payload=>Array.isArray(payload.stationNames))?.stationNames;
  const stations=Array.isArray(stationNames)?stationNames.filter((name):name is string=>typeof name==="string"):[];
  const name=formatStoreName({name:row.name,chain:row.chain_name??"",customName});
  const stationText=stations.length?`${stations.join("・")}周辺の`:"";
  const title=`${name}のコスメ取扱情報 | CosFind`;
  const description=`${stationText}${row.store_type}「${name}」の住所、取扱ブランド、最近報告されたコスメ・スキンケア情報を確認できます。`;
  const url=`${publicSiteOrigin}/stores/${encodeURIComponent(id)}`;
  return{title,description,alternates:{canonical:url},openGraph:{title,description,url,type:"website"}};
}
import {loadPage} from "@/lib/server/mobile-pages/store";
import {StoreView} from "@/components/pages/store";
export default async function Page({ params }: { params: Promise<{ id: string }> }){return <StoreView model={await loadPage({ params })} />;}
