import type {CatalogRepository} from "./repository";
import type {Product,StoreResult} from "@/types/domain";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
import {operatingPeriodQuery} from "@/lib/store-operating-period";

import {createStoreMetadataLoader} from "@/lib/store-metadata-cache";

const loadStoreMetadata=createStoreMetadataLoader();

export const supabaseRepository:CatalogRepository={
 async searchProducts(query){
  const db=createSupabaseBrowserClient();
  let request=db.from("products").select("id,name,category,additional_categories,jan_code,additional_jan_codes,release_date,spf,pa,brands(name),product_variants(id,variant_name,color_code,jan_code,release_date)").eq("is_active",true).order("name").order("created_at",{referencedTable:"product_variants"}).limit(500);
  const keyword=query.trim();
  if(keyword)request=/^\d+$/.test(keyword)?request.or(`name.ilike.%${keyword}%,jan_code.eq.${keyword},additional_jan_codes.cs.{${keyword}}`):request.ilike("name",`%${keyword.replaceAll("%","\\%").replaceAll("_","\\_")}%`);
  const{data,error}=await request;if(error)throw error;
 return(data??[]).map(row=>({id:row.id,brand:(row.brands as unknown as {name:string}|null)?.name??"",name:row.name,category:row.category,additionalCategories:row.additional_categories??[],janCode:row.jan_code??"",additionalJanCodes:row.additional_jan_codes??[],releaseDate:row.release_date??"",spf:row.spf,pa:row.pa,variants:((row.product_variants??[]) as unknown as {id:string;variant_name:string;color_code:string|null;jan_code:string|null;release_date:string|null}[]).map(v=>({id:v.id,name:v.variant_name,colorCode:v.color_code??undefined,janCode:v.jan_code??"",releaseDate:v.release_date??""}))})) as Product[];
 },
 async getStores(){
  type StoreRow={id:string;name:string;chain_name:string|null;store_type:string;address:string;latitude:number;longitude:number;created_at:string;opening_date:string|null;closing_date:string|null};
  type ReportRow={store_id:string;last_reported_at:string;report_count:number|null};
  const[reportResponse,storeResponse]=await Promise.all([fetch("/api/public/map-reports",{cache:"no-store"}),fetch("/api/public/map-stores",{cache:"no-store"})]);
  if(!storeResponse.ok)throw new Error("店舗情報を取得できませんでした");
  const storeRows=await storeResponse.json() as StoreRow[];
  if(!reportResponse.ok)throw new Error("在庫報告を取得できませんでした");
  const reports=await reportResponse.json() as ReportRow[];
  const reportByStore=new Map<string,{lastReportedAt:string;reportCount:number}>();
  for(const report of reports){const current=reportByStore.get(report.store_id);const lastReportedAt=current&&current.lastReportedAt>report.last_reported_at?current.lastReportedAt:report.last_reported_at;reportByStore.set(report.store_id,{lastReportedAt,reportCount:(current?.reportCount??0)+Number(report.report_count??0)})}
  const metadata=await loadStoreMetadata(storeRows.map(store=>store.id));
  return storeRows.map(store=>{const report=reportByStore.get(store.id);return{id:store.id,name:store.name,chain:store.chain_name??"",type:store.store_type,address:store.address,latitude:store.latitude,longitude:store.longitude,openingDate:store.opening_date??undefined,closingDate:store.closing_date??undefined,customName:metadata.stores?.[store.id]?.customName===true,stationNames:metadata.stores?.[store.id]?.stationNames??[],lastReportedAt:report?.lastReportedAt??store.created_at,variants:[],reportCount:report?.reportCount??0,distanceKm:0,businessHours:metadata.stores?.[store.id]?.businessHours??{}}}) as StoreResult[];
 },
 async getStoresForProduct(productId){
  const db=createSupabaseBrowserClient();
  const[{data:reports,error:reportError},{data:storeRows,error:storeError}]=await Promise.all([
   db.from("public_stock_summaries").select("store_id,last_reported_at,confirmed_variants,report_count").eq("product_id",productId),
   operatingPeriodQuery(db.from("stores").select("id,name,chain_name,store_type,address,latitude,longitude,created_at,opening_date,closing_date").eq("is_active",true)),
  ]);
  if(reportError)throw reportError;if(storeError)throw storeError;
  const reportByStore=new Map((reports??[]).map(report=>[report.store_id,report]));
  const metadata=await loadStoreMetadata((storeRows??[]).map(store=>store.id));
  return(storeRows??[]).map(store=>{const report=reportByStore.get(store.id);return{id:store.id,name:store.name,chain:store.chain_name??"",type:store.store_type,address:store.address,latitude:store.latitude,longitude:store.longitude,openingDate:store.opening_date??undefined,closingDate:store.closing_date??undefined,customName:metadata.stores?.[store.id]?.customName===true,stationNames:metadata.stores?.[store.id]?.stationNames??[],lastReportedAt:report?.last_reported_at??store.created_at,variants:report?.confirmed_variants??[],reportCount:report?.report_count??0,distanceKm:0,businessHours:metadata.stores?.[store.id]?.businessHours??{}}}) as StoreResult[];
 }
};
