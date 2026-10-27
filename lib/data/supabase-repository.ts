import type {CatalogRepository} from "./repository";
import type {Product,StoreResult} from "@/types/domain";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
import {operatingPeriodQuery} from "@/lib/store-operating-period";
import {fetchAllSupabaseRows} from "@/lib/supabase-pagination";

import {createStoreMetadataLoader} from "@/lib/store-metadata-cache";

const loadStoreMetadata=createStoreMetadataLoader();
const PUBLIC_PAGE_SIZE=1000;
type StoreRow={id:string;name:string;chain_name:string|null;store_type:string;address:string;latitude:number;longitude:number;created_at:string;opening_date:string|null;closing_date:string|null};
type ProductRow={id:string;name:string;category:string;additional_categories:string[]|null;jan_code:string|null;additional_jan_codes:string[]|null;release_date:string|null;spf:number|null;pa:string|null;brands:{name:string}|{name:string}[]|null;product_variants:{id:string;variant_name:string;color_code:string|null;jan_code:string|null;release_date:string|null}[]};
async function fetchPublicPage<T>(path:string,offset:number){const response=await fetch(`${path}?offset=${offset}`,{cache:"no-store"});if(!response.ok)throw new Error("店舗情報を取得できませんでした");return response.json() as Promise<T[]>;}
async function fetchAllPublicRows<T>(path:string){const rows:T[]=[];for(let offset=0;;offset+=PUBLIC_PAGE_SIZE*2){const[first,second]=await Promise.all([fetchPublicPage<T>(path,offset),fetchPublicPage<T>(path,offset+PUBLIC_PAGE_SIZE)]);rows.push(...first);if(first.length<PUBLIC_PAGE_SIZE)return rows;rows.push(...second);if(second.length<PUBLIC_PAGE_SIZE)return rows;}}

export const supabaseRepository:CatalogRepository={
 async searchProducts(query){
  const db=createSupabaseBrowserClient();
  const keyword=query.trim();
  const rows=await fetchAllSupabaseRows<ProductRow>((from,to)=>{let request=db.from("products").select("id,name,category,additional_categories,jan_code,additional_jan_codes,release_date,spf,pa,brands(name),product_variants(id,variant_name,color_code,jan_code,release_date)").eq("is_active",true).order("name").order("id").order("created_at",{referencedTable:"product_variants"});if(keyword)request=/^\d+$/.test(keyword)?request.or(`name.ilike.%${keyword}%,jan_code.eq.${keyword},additional_jan_codes.cs.{${keyword}}`):request.ilike("name",`%${keyword.replaceAll("%","\\%").replaceAll("_","\\_")}%`);return request.range(from,to)},500);
 return rows.map(row=>({id:row.id,brand:(Array.isArray(row.brands)?row.brands[0]?.name:row.brands?.name)??"",name:row.name,category:row.category,additionalCategories:row.additional_categories??[],janCode:row.jan_code??"",additionalJanCodes:row.additional_jan_codes??[],releaseDate:row.release_date??"",spf:row.spf,pa:row.pa,variants:(row.product_variants??[]).map(v=>({id:v.id,name:v.variant_name,colorCode:v.color_code??undefined,janCode:v.jan_code??"",releaseDate:v.release_date??""}))})) as Product[];
 },
 async getStores(onCoreRows){
  type ReportRow={store_id:string;last_reported_at:string;report_count:number|null};
  const reportsPromise=fetchAllPublicRows<ReportRow>("/api/public/map-reports");
  let storeRows:StoreRow[];
  try{storeRows=await fetchAllPublicRows<StoreRow>("/api/public/map-stores")}catch(error){void reportsPromise.catch(()=>undefined);throw error}
  const baseRows=storeRows.map(store=>({id:store.id,name:store.name,chain:store.chain_name??"",type:store.store_type,address:store.address,latitude:store.latitude,longitude:store.longitude,openingDate:store.opening_date??undefined,closingDate:store.closing_date??undefined,customName:false,stationNames:[],lastReportedAt:store.created_at,variants:[],reportCount:0,distanceKm:0,businessHours:{}})) as StoreResult[];
  onCoreRows?.(baseRows);
  const[reports,metadata]=await Promise.all([reportsPromise,loadStoreMetadata(storeRows.map(store=>store.id))]);
  const reportByStore=new Map<string,{lastReportedAt:string;reportCount:number}>();
  for(const report of reports){const current=reportByStore.get(report.store_id);const lastReportedAt=current&&current.lastReportedAt>report.last_reported_at?current.lastReportedAt:report.last_reported_at;reportByStore.set(report.store_id,{lastReportedAt,reportCount:(current?.reportCount??0)+Number(report.report_count??0)})}
  return baseRows.map(store=>{const report=reportByStore.get(store.id);return{...store,customName:metadata.stores?.[store.id]?.customName===true,stationNames:metadata.stores?.[store.id]?.stationNames??[],lastReportedAt:report?.lastReportedAt??store.lastReportedAt,reportCount:report?.reportCount??0,businessHours:metadata.stores?.[store.id]?.businessHours??{}}}) as StoreResult[];
 },
 async getStoresForProduct(productId){
  const db=createSupabaseBrowserClient();
  const[{data:reports,error:reportError},storeRows]=await Promise.all([
   db.from("public_stock_summaries").select("store_id,last_reported_at,confirmed_variants,report_count").eq("product_id",productId),
   fetchAllSupabaseRows<StoreRow>((from,to)=>operatingPeriodQuery(db.from("stores").select("id,name,chain_name,store_type,address,latitude,longitude,created_at,opening_date,closing_date").eq("is_active",true)).order("id").range(from,to)),
  ]);
  if(reportError)throw reportError;
  const reportByStore=new Map((reports??[]).map(report=>[report.store_id,report]));
  const metadata=await loadStoreMetadata(storeRows.map(store=>store.id));
  return storeRows.map(store=>{const report=reportByStore.get(store.id);return{id:store.id,name:store.name,chain:store.chain_name??"",type:store.store_type,address:store.address,latitude:store.latitude,longitude:store.longitude,openingDate:store.opening_date??undefined,closingDate:store.closing_date??undefined,customName:metadata.stores?.[store.id]?.customName===true,stationNames:metadata.stores?.[store.id]?.stationNames??[],lastReportedAt:report?.last_reported_at??store.created_at,variants:report?.confirmed_variants??[],reportCount:report?.report_count??0,distanceKm:0,businessHours:metadata.stores?.[store.id]?.businessHours??{}}}) as StoreResult[];
 }
};
