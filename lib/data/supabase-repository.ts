import type {CatalogRepository} from "./repository";
import type {Product,StoreResult} from "@/types/domain";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
import {operatingPeriodQuery} from "@/lib/store-operating-period";

export const supabaseRepository:CatalogRepository={
 async searchProducts(query){
  const db=createSupabaseBrowserClient();
  let request=db.from("products").select("id,name,category,jan_code,release_date,spf,pa,brands(name),product_variants(id,variant_name,color_code,jan_code,release_date)").eq("is_active",true).order("name").limit(500);
  if(query.trim())request=request.or(`name.ilike.%${query}%,jan_code.eq.${query}`);
  const{data,error}=await request;if(error)throw error;
 return(data??[]).map(row=>({id:row.id,brand:(row.brands as unknown as {name:string}|null)?.name??"",name:row.name,category:row.category,janCode:row.jan_code??"",releaseDate:row.release_date??"",spf:row.spf,pa:row.pa,variants:((row.product_variants??[]) as unknown as {id:string;variant_name:string;color_code:string|null;jan_code:string|null;release_date:string|null}[]).map(v=>({id:v.id,name:v.variant_name,colorCode:v.color_code??undefined,janCode:v.jan_code??"",releaseDate:v.release_date??""}))})) as Product[];
 },
 async getStores(){
  const db=createSupabaseBrowserClient();
  const[{data:reports,error:reportError},{data:storeRows,error:storeError}]=await Promise.all([
   db.from("public_stock_summaries").select("store_id,last_reported_at,report_count").limit(5000),
   operatingPeriodQuery(db.from("stores").select("id,name,chain_name,store_type,address,latitude,longitude,created_at,opening_date,closing_date").eq("is_active",true)),
  ]);
  if(reportError)throw reportError;if(storeError)throw storeError;
  const reportByStore=new Map<string,{lastReportedAt:string;reportCount:number}>();
  for(const report of reports??[]){const current=reportByStore.get(report.store_id);const lastReportedAt=current&&current.lastReportedAt>report.last_reported_at?current.lastReportedAt:report.last_reported_at;reportByStore.set(report.store_id,{lastReportedAt,reportCount:(current?.reportCount??0)+Number(report.report_count??0)})}
  const metadataResponse=await fetch(`/api/store-metadata?ids=${encodeURIComponent((storeRows??[]).map(store=>store.id).join(","))}`);
  const metadata=metadataResponse.ok?await metadataResponse.json() as {stores?:Record<string,{businessHours?:StoreResult["businessHours"];customName?:boolean}>}:{stores:{}};
  return(storeRows??[]).map(store=>{const report=reportByStore.get(store.id);return{id:store.id,name:store.name,chain:store.chain_name??"",type:store.store_type,address:store.address,latitude:store.latitude,longitude:store.longitude,openingDate:store.opening_date??undefined,closingDate:store.closing_date??undefined,customName:metadata.stores?.[store.id]?.customName===true,lastReportedAt:report?.lastReportedAt??store.created_at,variants:[],reportCount:report?.reportCount??0,distanceKm:0,businessHours:metadata.stores?.[store.id]?.businessHours??{}}}) as StoreResult[];
 },
 async getStoresForProduct(productId){
  const db=createSupabaseBrowserClient();
  const[{data:reports,error:reportError},{data:storeRows,error:storeError}]=await Promise.all([
   db.from("public_stock_summaries").select("store_id,last_reported_at,confirmed_variants,report_count").eq("product_id",productId),
   operatingPeriodQuery(db.from("stores").select("id,name,chain_name,store_type,address,latitude,longitude,created_at,opening_date,closing_date").eq("is_active",true)),
  ]);
  if(reportError)throw reportError;if(storeError)throw storeError;
  const reportByStore=new Map((reports??[]).map(report=>[report.store_id,report]));
  const metadataResponse=await fetch(`/api/store-metadata?ids=${encodeURIComponent((storeRows??[]).map(store=>store.id).join(","))}`);
  const metadata=metadataResponse.ok?await metadataResponse.json() as {stores?:Record<string,{businessHours?:StoreResult["businessHours"];customName?:boolean}>}:{stores:{}};
  return(storeRows??[]).map(store=>{const report=reportByStore.get(store.id);return{id:store.id,name:store.name,chain:store.chain_name??"",type:store.store_type,address:store.address,latitude:store.latitude,longitude:store.longitude,openingDate:store.opening_date??undefined,closingDate:store.closing_date??undefined,customName:metadata.stores?.[store.id]?.customName===true,lastReportedAt:report?.last_reported_at??store.created_at,variants:report?.confirmed_variants??[],reportCount:report?.report_count??0,distanceKm:0,businessHours:metadata.stores?.[store.id]?.businessHours??{}}}) as StoreResult[];
 }
};
