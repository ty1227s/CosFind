import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAuthenticatedAdmin, isSameOrigin } from "@/lib/server/security";
import { UUID_PATTERN } from "@/lib/server/validation";
import { isValidOperatingDate, operatingPeriodQuery } from "@/lib/store-operating-period";
import { isPrefecture } from "@/lib/prefectures";
import municipalitySource from "@/lib/municipalities.generated.json";
import { isRailwayRegion } from "@/lib/railway-regions";
import { readLatestCatalogMetadata } from "@/lib/server/catalog-metadata";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";
import { isProductMediaType, normalizeProductMediaUrl, type ProductMediaMention } from "@/lib/product-media";

type Entity = "brand" | "chain" | "product" | "store" | "station" | "railwayLine" | "railwayCompany";
type Brand = { name: string; nameKana?: string };
type Chain = { name: string; storeType: string };
type Product = { id?:string; brand: string; name: string; category: string; additionalCategories?:string[]; janCode?: string; additionalJanCodes?:string[]; releaseDate?:string; spf?:number|null; pa?:string|null; createdAt?:string; variants: { name: string; colorCode?: string; janCode?: string; releaseDate?:string }[]; mediaMentions?: ProductMediaMention[] };
type StoreHoursPeriod={openingTime:string;closingTime:string};
type StoreHours=Record<string,{openingTime:string;closingTime:string;periods?:StoreHoursPeriod[];closed:boolean}>;
type Store = { id?: string; name: string; chain?: string; type: string; address: string; latitude: number; longitude: number; customName?:boolean; stationNames?:string[]; createdAt?:string; provisionalBrandIds?:string[]; openingTime?:string; closingTime?:string; openingDate?:string; closingDate?:string; businessHours?:StoreHours };
type Station = { name: string; prefecture?: string; municipality?: string; lineNames?: string[] };
type RailwayLine = { name: string; companies?: string[]; company?: string; stationNames?: string[]; visualType?: "image" | "color"; imageUrl?: string; lineColor?: string };
type RailwayCompany = { name: string; regions?: string[] };
type StoreRow = { id:string;name:string;chain_name:string|null;store_type:string;address:string;latitude:number;longitude:number;opening_date:string|null;closing_date:string|null;created_at:string };
type ProductRow = { id: string; name: string; category: string; additional_categories:string[]|null; jan_code: string | null; additional_jan_codes:string[]|null; release_date:string|null;spf:number|null;pa:string|null;created_at:string; brands: { name: string } | { name: string }[] | null; product_variants: { id: string; variant_name: string; color_code: string | null; jan_code: string | null; release_date:string|null }[] };
type ProductMediaRow = { id:string;product_id:string;media_type:string;source_name:string;title:string|null;url:string|null;published_on:string|null;note:string|null;sort_order:number };
function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "保存に失敗しました";
}

function isMissingProductMediaTable(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  return message.includes("product_media_mentions") && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"));
}

function sanitizeMediaMentions(input: unknown) {
  if (input != null && !Array.isArray(input)) throw new Error("メディア掲載情報の形式が不正です");
  const mentions = (input ?? []).slice(0, 50).map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`${index + 1}件目の掲載情報が不正です`);
    const mention = value as Record<string, unknown>;
    if (!isProductMediaType(mention.mediaType)) throw new Error(`${index + 1}件目の媒体種別が不正です`);
    const sourceName = (typeof mention.sourceName === "string" ? mention.sourceName : "").trim().slice(0, 120);
    const title = (typeof mention.title === "string" ? mention.title : "").trim().slice(0, 200);
    const note = (typeof mention.note === "string" ? mention.note : "").trim().slice(0, 300);
    const rawUrl = (typeof mention.url === "string" ? mention.url : "").trim();
    const url = normalizeProductMediaUrl(rawUrl);
    const publishedOn = (typeof mention.publishedOn === "string" ? mention.publishedOn : "").trim();
    if (!sourceName) throw new Error(`${index + 1}件目の掲載元・アカウント名を入力してください`);
    if (rawUrl && !url) throw new Error(`${index + 1}件目のURLはhttps://から入力してください`);
    if (mention.mediaType !== "magazine" && !url) throw new Error(`${index + 1}件目のURLを入力してください`);
    if (publishedOn && !/^\d{4}-\d{2}-\d{2}$/.test(publishedOn)) throw new Error(`${index + 1}件目の掲載日が不正です`);
    return { mediaType:mention.mediaType,sourceName,title,url,publishedOn,note,sortOrder:index };
  });
  const urls = mentions.map((mention) => mention.url).filter(Boolean);
  if (new Set(urls).size !== urls.length) throw new Error("同じURLのメディア掲載情報が重複しています");
  return mentions;
}

async function authorized() {
  try { return await isAuthenticatedAdmin(); }
  catch { return false; }
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  try {
    const db = createSupabaseAdminClient();
    const productMediaPromise=fetchAllSupabaseRows<ProductMediaRow>((from,to)=>db.from("product_media_mentions").select("id,product_id,media_type,source_name,title,url,published_on,note,sort_order").order("product_id").order("sort_order").order("id").range(from,to)).then(rows=>({rows,available:true})).catch(error=>{if(isMissingProductMediaTable(error))return{rows:[] as ProductMediaRow[],available:false};throw error});
    const [brandsResult, chainsResult, productRows, storeRows, productRequestsResult, storeRequestsResult, productMediaCatalog] = await Promise.all([
      db.from("brands").select("id,name,name_kana").order("name"),
      db.from("store_chains").select("id,name,store_type").eq("is_active", true).order("name"),
      fetchAllSupabaseRows<ProductRow>((from,to)=>db.from("products").select("id,name,category,additional_categories,jan_code,additional_jan_codes,release_date,spf,pa,created_at,brands(name),product_variants(id,variant_name,color_code,jan_code,release_date)").eq("is_active", true).order("name").order("id").order("created_at", { referencedTable: "product_variants" }).range(from,to)),
      fetchAllSupabaseRows<StoreRow>((from,to)=>db.from("stores").select("id,name,chain_name,store_type,address,latitude,longitude,opening_date,closing_date,created_at").eq("is_active", true).order("name").order("id").range(from,to)),
      db.from("product_requests").select("id,user_id,payload,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(1000),
      db.from("store_requests").select("id,payload,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(1000),
      productMediaPromise,
    ]);
    const error = brandsResult.error || chainsResult.error || productRequestsResult.error || storeRequestsResult.error;
    if (error) throw error;
    const metadataRows=await readLatestCatalogMetadata(db,["store_provisional_brands","station_directory","railway_line_directory","railway_company_directory"]);
    const storeMetadata=new Map<string,{brandIds:string[];openingTime:string;closingTime:string;businessHours:StoreHours;customName:boolean;stationNames:string[]}>();
    const stationMetadata=new Map<string,{prefecture:string;municipality:string;lineNames:string[];isActive:boolean}>();
    const railwayLineMetadata=new Map<string,{companies:string[];stationNames:string[];visualType:"image"|"color";imageUrl:string;lineColor:string;isActive:boolean}>();
    const railwayCompanyMetadata=new Map<string,{regions:string[];isActive:boolean}>();
    for(const item of metadataRows){
      const payload=item.payload as{metadataType?:string;storeId?:string;brandIds?:unknown;openingTime?:unknown;closingTime?:unknown;businessHours?:unknown;customName?:unknown;stationNames?:unknown;stationName?:unknown;prefecture?:unknown;municipality?:unknown;lineName?:unknown;lineNames?:unknown;companies?:unknown;company?:unknown;companyName?:unknown;regions?:unknown;visualType?:unknown;imageUrl?:unknown;lineColor?:unknown;isActive?:unknown};
      if(payload.metadataType==="railway_company_directory"&&typeof payload.companyName==="string"){
        railwayCompanyMetadata.set(payload.companyName,{regions:Array.isArray(payload.regions)?payload.regions.filter((region):region is string=>typeof region==="string"&&isRailwayRegion(region)):[],isActive:payload.isActive!==false});
        continue;
      }
      if(payload.metadataType==="station_directory"&&typeof payload.stationName==="string"){
        stationMetadata.set(payload.stationName,{prefecture:typeof payload.prefecture==="string"?payload.prefecture:"",municipality:typeof payload.municipality==="string"?payload.municipality:"",lineNames:Array.isArray(payload.lineNames)?payload.lineNames.filter((name):name is string=>typeof name==="string"):[],isActive:payload.isActive!==false});
        continue;
      }
      if(payload.metadataType==="railway_line_directory"&&typeof payload.lineName==="string"){
        const companies=Array.isArray(payload.companies)?payload.companies.filter((name):name is string=>typeof name==="string"&&Boolean(name.trim())):typeof payload.company==="string"&&payload.company.trim()?[payload.company]:[];
        const imageUrl=typeof payload.imageUrl==="string"?payload.imageUrl:"";const lineColor=typeof payload.lineColor==="string"&&/^#[0-9a-f]{6}$/i.test(payload.lineColor)?payload.lineColor.toLowerCase():"";const visualType=payload.visualType==="color"?"color":payload.visualType==="image"?"image":imageUrl?"image":"color";
        railwayLineMetadata.set(payload.lineName,{companies:[...new Set(companies)],stationNames:Array.isArray(payload.stationNames)?payload.stationNames.filter((name):name is string=>typeof name==="string"):[],visualType,imageUrl,lineColor,isActive:payload.isActive!==false});
        continue;
      }
      if(!payload.storeId)continue;
      const previous=storeMetadata.get(payload.storeId)??{brandIds:[],openingTime:"",closingTime:"",businessHours:{},customName:false,stationNames:[]};
      storeMetadata.set(payload.storeId,{
        brandIds:Array.isArray(payload.brandIds)?payload.brandIds.filter((id):id is string=>typeof id==="string"):previous.brandIds,
        openingTime:typeof payload.openingTime==="string"?payload.openingTime:previous.openingTime,
        closingTime:typeof payload.closingTime==="string"?payload.closingTime:previous.closingTime,
        businessHours:payload.businessHours&&typeof payload.businessHours==="object"?payload.businessHours as StoreHours:previous.businessHours,
        customName:typeof payload.customName==="boolean"?payload.customName:previous.customName,
        stationNames:Array.isArray(payload.stationNames)?payload.stationNames.filter((name):name is string=>typeof name==="string"):previous.stationNames,
      });
    }
    for(const metadata of storeMetadata.values())for(const stationName of metadata.stationNames)if(!stationMetadata.has(stationName))stationMetadata.set(stationName,{prefecture:"",municipality:"",lineNames:[],isActive:true});
    const lineMembers=new Map<string,string[]>();
    for(const [stationName,metadata] of stationMetadata)if(metadata.isActive)for(const lineName of metadata.lineNames){const members=lineMembers.get(lineName)??[];if(!members.includes(stationName))members.push(stationName);lineMembers.set(lineName,members)}
    const railwayLineNames=new Set([...railwayLineMetadata.entries()].filter(([,metadata])=>metadata.isActive).map(([name])=>name));for(const name of lineMembers.keys())railwayLineNames.add(name);
    const railwayCompanyNames=new Set([...railwayCompanyMetadata.entries()].filter(([,metadata])=>metadata.isActive).map(([name])=>name));for(const metadata of railwayLineMetadata.values())if(metadata.isActive)for(const company of metadata.companies)railwayCompanyNames.add(company);
    const mediaByProduct=new Map<string,ProductMediaMention[]>();
    for(const mention of productMediaCatalog.rows){if(!isProductMediaType(mention.media_type))continue;const items=mediaByProduct.get(mention.product_id)??[];items.push({id:mention.id,mediaType:mention.media_type,sourceName:mention.source_name,title:mention.title??"",url:mention.url??"",publishedOn:mention.published_on??"",note:mention.note??""});mediaByProduct.set(mention.product_id,items)}
    const requestStoreNames=new Map(storeRows.map(store=>[store.id,[store.chain_name,store.name].filter(Boolean).join(" ")]));
    return NextResponse.json({
      ok: true,
      brands: (brandsResult.data ?? []).map((row) => ({ id: row.id, name: row.name, nameKana: row.name_kana ?? "" })),
      chains: (chainsResult.data ?? []).map((row) => ({ id: row.id, name: row.name, storeType: row.store_type })),
      products: productRows.map((row) => ({ id: row.id, brand: Array.isArray(row.brands) ? row.brands[0]?.name ?? "" : row.brands?.name ?? "", name: row.name, category: row.category, additionalCategories:row.additional_categories??[], janCode: row.jan_code ?? "", additionalJanCodes:row.additional_jan_codes??[], releaseDate:row.release_date??"",spf:row.spf,pa:row.pa,createdAt:row.created_at,variants: row.product_variants.map((variant) => ({ id: variant.id, name: variant.variant_name === variant.color_code ? "" : variant.variant_name, colorCode: variant.color_code ?? "", janCode: variant.jan_code ?? "",releaseDate:variant.release_date??"" })),mediaMentions:mediaByProduct.get(row.id)??[] })),
      stores: storeRows.map((row) => {const metadata=storeMetadata.get(row.id);return { id: row.id, name: row.name, chain: row.chain_name ?? "", type: row.store_type, address: row.address, latitude: row.latitude, longitude: row.longitude,openingDate:row.opening_date??"",closingDate:row.closing_date??"",customName:metadata?.customName??false,stationNames:metadata?.stationNames??[],createdAt:row.created_at,provisionalBrandIds:metadata?.brandIds??[],openingTime:metadata?.openingTime??"",closingTime:metadata?.closingTime??"",businessHours:metadata?.businessHours??{} }}),
      stations: [...stationMetadata.entries()].filter(([,metadata])=>metadata.isActive).map(([name,metadata])=>({name,prefecture:metadata.prefecture,municipality:metadata.municipality,lineNames:metadata.lineNames})).sort((left,right)=>left.name.localeCompare(right.name,"ja")),
      railwayLines: [...railwayLineNames].map(name=>{const members=lineMembers.get(name)??[];const configured=railwayLineMetadata.get(name);const preferred=configured?.stationNames??[];return{name,companies:configured?.companies??[],visualType:configured?.visualType??"color",imageUrl:configured?.imageUrl??"",lineColor:configured?.lineColor??"",stationNames:[...preferred.filter(station=>members.includes(station)),...members.filter(station=>!preferred.includes(station)).sort((left,right)=>left.localeCompare(right,"ja"))]}}).sort((left,right)=>left.name.localeCompare(right.name,"ja")),
      railwayCompanies: [...railwayCompanyNames].map(name=>({name,regions:railwayCompanyMetadata.get(name)?.regions??[]})).sort((left,right)=>left.name.localeCompare(right.name,"ja")),
      productRequests: (productRequestsResult.data ?? []).map((row) => {const payload=(row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)) ? row.payload as Record<string, unknown> : {};const reportStoreId=typeof payload.reportStoreId==="string"?payload.reportStoreId:"";return {...payload,id:row.id,submittedByUserId:row.user_id,reportStoreName:reportStoreId?requestStoreNames.get(reportStoreId)??"店舗情報なし":"",createdAt:row.created_at,status:"pending"}}),
      storeRequests: (storeRequestsResult.data ?? []).map((row) => ({ ...((row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)) ? row.payload as Record<string, unknown> : {}), id: row.id, createdAt: row.created_at, status: "pending" })),
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) || "Supabaseからの読み込みに失敗しました" }, { status: 500 });
  }
}
async function getBrandId(name: string) {
  const db = createSupabaseAdminClient();
  const found = await db.from("brands").select("id").eq("name", name).maybeSingle();
  if (found.error) throw found.error;
  if (found.data) return found.data.id;
  const created = await db.from("brands").insert({ name, name_kana: null }).select("id").single();
  if (created.error) throw created.error;
  return created.data.id;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  if (!(await authorized())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  try {
    const body = await request.json() as { entity: Entity; data: Brand | Chain | Product | Store | Station | RailwayLine | RailwayCompany; previous?: Brand | Chain | Product | Store | Station | RailwayLine | RailwayCompany };
    let savedData: unknown;
    const db = createSupabaseAdminClient();
    if (body.entity === "brand") {
      const row = body.data as Brand; const previousCandidate = body.previous as Brand | undefined; const previous = previousCandidate?.name?.trim() ? previousCandidate : undefined;
      const values = { name: row.name.trim(), name_kana: row.nameKana?.trim() || null };
      const result = previous ? await db.from("brands").update(values).eq("name", previous.name) : await db.from("brands").upsert(values, { onConflict: "name" });
      if (result.error) throw result.error;
    } else if (body.entity === "chain") {
      const row = body.data as Chain; const previousCandidate = body.previous as Chain | undefined; const previous = previousCandidate?.name?.trim() ? previousCandidate : undefined;
      const values = { name: row.name.trim(), store_type: row.storeType, is_active: true };
      const result = previous ? await db.from("store_chains").update(values).eq("name", previous.name) : await db.from("store_chains").upsert(values, { onConflict: "name" });
      if (result.error) throw result.error;
      if (previous && previous.name !== row.name) { const stores = await db.from("stores").update({ chain_name: row.name, store_type: row.storeType }).eq("chain_name", previous.name); if (stores.error) throw stores.error; }
    } else if (body.entity === "product") {
      const row = body.data as Product; const previous = body.previous as Product | undefined; let productId = ""; let productCreatedAt = previous?.createdAt ?? "";
      const mediaMentions=sanitizeMediaMentions(row.mediaMentions);
      const mediaTableCheck=await db.from("product_media_mentions").select("id").limit(1);
      const mediaTableAvailable=!mediaTableCheck.error;
      if(mediaTableCheck.error&&!isMissingProductMediaTable(mediaTableCheck.error))throw mediaTableCheck.error;
      if(!mediaTableAvailable&&mediaMentions.length)throw new Error("メディア掲載情報用のSQL（0012_product_media_mentions.sql）を先に実行してください");
      const currentBrandId = await getBrandId(row.brand);
      const primaryJanCode = row.janCode?.trim() || null;
      const additionalJanCodes = [...new Set((row.additionalJanCodes??[]).map((code)=>code.trim()).filter((code)=>code&&code!==primaryJanCode))].slice(0,30);
      if(row.variants.some((variant)=>!variant.name.trim()&&!variant.colorCode?.trim()&&Boolean(variant.janCode?.trim()||variant.releaseDate?.trim())))throw new Error("カラー名または色番がないバリエーション行があります");
      if (previous) {
        const previousBrandId = await getBrandId(previous.brand);
        const found = await db.from("products").select("id,created_at").eq("brand_id", previousBrandId).eq("name", previous.name).maybeSingle();
        if (found.error) throw found.error;
        if (found.data) { productId = found.data.id; productCreatedAt = found.data.created_at; const updated = await db.from("products").update({ brand_id: currentBrandId, name: row.name.trim(), category: row.category, additional_categories:[...new Set((row.additionalCategories??[]).filter(category=>category&&category!==row.category))], jan_code:primaryJanCode,additional_jan_codes:additionalJanCodes,release_date:row.releaseDate||null,spf:Number.isFinite(row.spf)?row.spf:null,pa:["+","++","+++","++++"].includes(row.pa||"")?row.pa:null,is_active: true }).eq("id", productId); if (updated.error) throw updated.error; }
      }
      if (!productId) { const saved = await db.from("products").upsert({ brand_id: currentBrandId, name: row.name.trim(), category: row.category, additional_categories:[...new Set((row.additionalCategories??[]).filter(category=>category&&category!==row.category))], jan_code:primaryJanCode,additional_jan_codes:additionalJanCodes,release_date:row.releaseDate||null,spf:Number.isFinite(row.spf)?row.spf:null,pa:["+","++","+++","++++"].includes(row.pa||"")?row.pa:null,is_active: true }, { onConflict: "brand_id,name" }).select("id,created_at").single(); if (saved.error) throw saved.error; productId = saved.data.id; productCreatedAt = saved.data.created_at; }
      const removed = await db.from("product_variants").delete().eq("product_id", productId); if (removed.error) throw removed.error;
      const variants = row.variants.filter((variant) => variant.name.trim() || variant.colorCode?.trim()).map((variant, index) => { const colorCode=variant.colorCode?.trim()||null;return { product_id: productId, variant_name: variant.name.trim() || colorCode!, color_code: colorCode, jan_code: variant.janCode || null,release_date:variant.releaseDate||null,created_at:new Date(Date.now()+index).toISOString() }});
      if (variants.length) { const inserted = await db.from("product_variants").insert(variants); if (inserted.error) throw inserted.error; }
      let confirmedMedia:ProductMediaMention[]=[];
      if(mediaTableAvailable){const removedMedia=await db.from("product_media_mentions").delete().eq("product_id",productId);if(removedMedia.error)throw removedMedia.error;if(mediaMentions.length){const insertedMedia=await db.from("product_media_mentions").insert(mediaMentions.map(mention=>({product_id:productId,media_type:mention.mediaType,source_name:mention.sourceName,title:mention.title||null,url:mention.url||null,published_on:mention.publishedOn||null,note:mention.note||null,sort_order:mention.sortOrder}))).select("id,media_type,source_name,title,url,published_on,note,sort_order");if(insertedMedia.error)throw insertedMedia.error;confirmedMedia=((insertedMedia.data??[]) as ProductMediaRow[]).sort((left,right)=>left.sort_order-right.sort_order).flatMap(mention=>isProductMediaType(mention.media_type)?[{id:mention.id,mediaType:mention.media_type,sourceName:mention.source_name,title:mention.title??"",url:mention.url??"",publishedOn:mention.published_on??"",note:mention.note??""}]:[])}}
      const confirmedVariants=await db.from("product_variants").select("id,variant_name,color_code,jan_code,release_date").eq("product_id",productId).order("created_at");if(confirmedVariants.error)throw confirmedVariants.error;
      savedData={id:productId,brand:row.brand,name:row.name.trim(),category:row.category,additionalCategories:[...new Set((row.additionalCategories??[]).filter(category=>category&&category!==row.category))],janCode:primaryJanCode??"",additionalJanCodes,releaseDate:row.releaseDate||"",spf:Number.isFinite(row.spf)?row.spf:null,pa:["+","++","+++","++++"].includes(row.pa||"")?row.pa:null,createdAt:productCreatedAt,variants:(confirmedVariants.data??[]).map(variant=>({id:variant.id,name:variant.variant_name===variant.color_code?"":variant.variant_name,colorCode:variant.color_code??"",janCode:variant.jan_code??"",releaseDate:variant.release_date??""})),mediaMentions:confirmedMedia};
    } else if (body.entity === "station") {
      const row=body.data as Station;const previous=body.previous as Station|undefined;
      const stationNameRaw=row.name.replace(/[\s　]+/g," ").trim().slice(0,50);
      const stationName=stationNameRaw.endsWith("駅")?stationNameRaw:`${stationNameRaw}駅`;
      if(!stationNameRaw)throw new Error("駅名を入力してください");
      const lineNames=[...new Set((row.lineNames??[]).map(name=>name.replace(/[\s　]+/g," ").trim().slice(0,60)).filter(Boolean))].slice(0,20);
      const prefectureCandidate=row.prefecture?.trim()??"";
      if(!isPrefecture(prefectureCandidate))throw new Error("都道府県を選択してください");
      const prefecture=prefectureCandidate;
      const municipality=row.municipality?.trim()??"";
      const municipalityMap=municipalitySource as Record<string,string[]>;
      if(!municipality||!municipalityMap[prefecture]?.includes(municipality))throw new Error("都道府県に対応する市区町村を選択してください");
      const authUser=await getAuthenticatedUser();let ownerId=authUser?.id||"";
      if(!ownerId){const fallback=await db.from("profiles").select("id").order("created_at",{ascending:true}).limit(1).maybeSingle();if(fallback.error||!fallback.data)throw fallback.error||new Error("駅情報を保存できるプロフィールがありません");ownerId=fallback.data.id}
      const previousName=previous?.name?.trim()||"";
      if(previousName&&previousName!==stationName){
        const metadataRows=await readLatestCatalogMetadata(db,["store_provisional_brands","railway_line_directory"],true);
        const latestByStore=new Map<string,{userId:string;payload:Record<string,unknown>}>();const latestLines=new Map<string,{userId:string;payload:Record<string,unknown>}>();
        for(const item of metadataRows){const payload=item.payload&&typeof item.payload==="object"&&!Array.isArray(item.payload)?item.payload as Record<string,unknown>:{};const storeId=typeof payload.storeId==="string"?payload.storeId:"";if(storeId)latestByStore.set(storeId,{userId:item.user_id??ownerId,payload});if(payload.metadataType==="railway_line_directory"&&typeof payload.lineName==="string")latestLines.set(payload.lineName,{userId:item.user_id??ownerId,payload})}
        const replacements=[...latestByStore.values()].filter(item=>Array.isArray(item.payload.stationNames)&&item.payload.stationNames.includes(previousName)).map(item=>({user_id:item.userId||ownerId,status:"metadata",payload:{...item.payload,stationNames:[...new Set((item.payload.stationNames as unknown[]).map(name=>name===previousName?stationName:name).filter((name):name is string=>typeof name==="string"))]}}));
        if(replacements.length){const changed=await db.from("store_requests").insert(replacements);if(changed.error)throw changed.error}
        const lineReplacements=[...latestLines.values()].filter(item=>item.payload.isActive!==false&&Array.isArray(item.payload.stationNames)&&item.payload.stationNames.includes(previousName)).map(item=>({user_id:item.userId||ownerId,status:"metadata",payload:{...item.payload,stationNames:(item.payload.stationNames as unknown[]).map(name=>name===previousName?stationName:name)}}));
        if(lineReplacements.length){const changed=await db.from("store_requests").insert(lineReplacements);if(changed.error)throw changed.error}
        const retired=await db.from("store_requests").insert({user_id:ownerId,status:"metadata",payload:{metadataType:"station_directory",stationName:previousName,prefecture:"",municipality:"",lineNames:[],isActive:false}});if(retired.error)throw retired.error;
      }
      const metadata=await db.from("store_requests").insert({user_id:ownerId,status:"metadata",payload:{metadataType:"station_directory",stationName,prefecture,municipality,lineNames,isActive:true}});if(metadata.error)throw metadata.error;
      savedData={name:stationName,prefecture,municipality,lineNames};
    } else if (body.entity === "railwayCompany") {
      const row=body.data as RailwayCompany;const previous=body.previous as RailwayCompany|undefined;
      const companyName=row.name.replace(/[\s　]+/g," ").trim().slice(0,80);if(!companyName)throw new Error("鉄道会社名を入力してください");
      const regions=[...new Set((row.regions??[]).filter((region):region is string=>typeof region==="string"&&isRailwayRegion(region)))];
      const authUser=await getAuthenticatedUser();let ownerId=authUser?.id||"";
      if(!ownerId){const fallback=await db.from("profiles").select("id").order("created_at",{ascending:true}).limit(1).maybeSingle();if(fallback.error||!fallback.data)throw fallback.error||new Error("鉄道会社情報を保存できるプロフィールがありません");ownerId=fallback.data.id}
      const previousName=previous?.name?.trim()||"";
      if(previousName&&previousName!==companyName){const retired=await db.from("store_requests").insert({user_id:ownerId,status:"metadata",payload:{metadataType:"railway_company_directory",companyName:previousName,regions:[],isActive:false}});if(retired.error)throw retired.error}
      const metadata=await db.from("store_requests").insert({user_id:ownerId,status:"metadata",payload:{metadataType:"railway_company_directory",companyName,regions,isActive:true}});if(metadata.error)throw metadata.error;
      savedData={name:companyName,regions};
    } else if (body.entity === "railwayLine") {
      const row=body.data as RailwayLine;const previous=body.previous as RailwayLine|undefined;
      const lineName=row.name.replace(/[\s　]+/g," ").trim().slice(0,60);if(!lineName)throw new Error("路線名を入力してください");
      const companies=[...new Set((row.companies??(row.company?[row.company]:[])).map(name=>name.replace(/[\s　]+/g," ").trim().slice(0,80)).filter(Boolean))].slice(0,10);
      const stationNames=[...new Set((row.stationNames??[]).map(name=>name.replace(/[\s　]+/g," ").trim().slice(0,50)).filter(Boolean).map(name=>name.endsWith("駅")?name:`${name}駅`))].slice(0,200);
      const imageUrl=typeof row.imageUrl==="string"&&/^https:\/\//.test(row.imageUrl)&&row.imageUrl.length<=1000?row.imageUrl:"";
      const visualType=row.visualType==="image"?"image":"color";const rawLineColor=(row.lineColor??"").trim();if(rawLineColor&&!/^#[0-9a-f]{6}$/i.test(rawLineColor))throw new Error("ラインカラーは #231ef4 のような6桁のカラーコードで入力してください");const lineColor=rawLineColor.toLowerCase();
      const authUser=await getAuthenticatedUser();let ownerId=authUser?.id||"";
      if(!ownerId){const fallback=await db.from("profiles").select("id").order("created_at",{ascending:true}).limit(1).maybeSingle();if(fallback.error||!fallback.data)throw fallback.error||new Error("路線情報を保存できるプロフィールがありません");ownerId=fallback.data.id}
      const metadataRows=await readLatestCatalogMetadata(db,["store_provisional_brands","station_directory"]);
      const latestStations=new Map<string,{prefecture:string;municipality:string;lineNames:string[];isActive:boolean}>();const storeStationNames=new Set<string>();
      for(const item of metadataRows){const payload=item.payload&&typeof item.payload==="object"&&!Array.isArray(item.payload)?item.payload as Record<string,unknown>:{};if(payload.metadataType==="station_directory"&&typeof payload.stationName==="string")latestStations.set(payload.stationName,{prefecture:typeof payload.prefecture==="string"?payload.prefecture:"",municipality:typeof payload.municipality==="string"?payload.municipality:"",lineNames:Array.isArray(payload.lineNames)?payload.lineNames.filter((name):name is string=>typeof name==="string"):[],isActive:payload.isActive!==false});if(typeof payload.storeId==="string"&&Array.isArray(payload.stationNames))for(const name of payload.stationNames)if(typeof name==="string")storeStationNames.add(name)}
      for(const stationName of storeStationNames)if(!latestStations.has(stationName))latestStations.set(stationName,{prefecture:"",municipality:"",lineNames:[],isActive:true});
      const previousName=previous?.name?.trim()||"";const selectedStations=new Set(stationNames);const stationUpdates:{user_id:string;status:"metadata";payload:{metadataType:"station_directory";stationName:string;prefecture:string;municipality:string;lineNames:string[];isActive:true}}[]=[];
      for(const [stationName,station] of latestStations){if(!station.isActive)continue;const next=station.lineNames.filter(name=>name!==previousName&&name!==lineName);if(selectedStations.has(stationName))next.push(lineName);const lineNames=[...new Set(next)];if(lineNames.length!==station.lineNames.length||lineNames.some((name,index)=>name!==station.lineNames[index]))stationUpdates.push({user_id:ownerId,status:"metadata",payload:{metadataType:"station_directory",stationName,prefecture:station.prefecture,municipality:station.municipality,lineNames,isActive:true}})}
      if(stationUpdates.length){const updated=await db.from("store_requests").insert(stationUpdates);if(updated.error)throw updated.error}
      if(previousName&&previousName!==lineName){const retired=await db.from("store_requests").insert({user_id:ownerId,status:"metadata",payload:{metadataType:"railway_line_directory",lineName:previousName,stationNames:[],isActive:false}});if(retired.error)throw retired.error}
      const metadata=await db.from("store_requests").insert({user_id:ownerId,status:"metadata",payload:{metadataType:"railway_line_directory",lineName,companies,stationNames,visualType,imageUrl,lineColor,isActive:true}});if(metadata.error)throw metadata.error;
      savedData={name:lineName,companies,stationNames,visualType,imageUrl,lineColor};
    } else {
      const row = body.data as Store; const previous = body.previous as Store | undefined; let chainId: string | null = null;
      const openingDate = row.openingDate?.trim() || null;
      const closingDate = row.closingDate?.trim() || null;
      if ((openingDate && !isValidOperatingDate(openingDate)) || (closingDate && !isValidOperatingDate(closingDate))) throw new Error("開店日または閉店日の形式が正しくありません");
      if (openingDate && closingDate && openingDate > closingDate) throw new Error("閉店日は開店日以降の日付を指定してください");
      if (row.chain) { const chain = await db.from("store_chains").select("id").eq("name", row.chain).limit(1).maybeSingle(); if (chain.error) throw chain.error; chainId = chain.data?.id ?? null; }
      const values = { name: row.name.trim(), chain_id: chainId, chain_name: row.chain || null, store_type: row.type, address: row.address.trim(), latitude: row.latitude, longitude: row.longitude, opening_date: openingDate, closing_date: closingDate, is_active: true };
      const columns = "id,name,chain_name,store_type,address,latitude,longitude,opening_date,closing_date,created_at";
      let result;
      if (previous) {
        const byId = previous.id ? await db.from("stores").update(values).eq("id", previous.id).select(columns).maybeSingle() : { data: null, error: null };
        if (byId.error) throw byId.error;
        if (byId.data) result = byId;
        else {
          const byIdentity = await db.from("stores").update(values).eq("name", previous.name).eq("address", previous.address).select(columns).limit(1).maybeSingle();
          if (byIdentity.error) throw byIdentity.error;
          result = byIdentity.data ? byIdentity : await db.from("stores").insert(values).select(columns).single();
        }
      } else result = await db.from("stores").insert(values).select(columns).single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("保存した店舗を取得できませんでした");
      const provisionalBrandIds=(row.provisionalBrandIds??[]).filter(Boolean);const businessHours=Object.fromEntries(["mon","tue","wed","thu","fri","sat","sun"].map(day=>{const hours=row.businessHours?.[day];const cleanTime=(value:unknown)=>typeof value==="string"&&/^\d{2}:\d{2}$/.test(value)?value:"";const suppliedPeriods=Array.isArray(hours?.periods)?hours.periods:[];let periods=suppliedPeriods.map(period=>({openingTime:cleanTime(period?.openingTime),closingTime:cleanTime(period?.closingTime)})).filter(period=>period.openingTime||period.closingTime).slice(0,8);if(!periods.length){const legacy={openingTime:cleanTime(hours?.openingTime),closingTime:cleanTime(hours?.closingTime)};if(legacy.openingTime||legacy.closingTime)periods=[legacy]}const first=periods[0];return[day,{openingTime:first?.openingTime||"",closingTime:first?.closingTime||"",periods,closed:hours?.closed===true}]})) as StoreHours;
      const stationNames=[...new Set((row.stationNames??[]).map(name=>name.replace(/[\s　]+/g," ").trim().slice(0,50)).filter(Boolean).map(name=>name.endsWith("駅")?name:`${name}駅`))].slice(0,12);
      if(Boolean(previous)||provisionalBrandIds.length>0||row.customName===true||stationNames.length>0||Object.values(businessHours).some(hours=>hours.closed||(hours.periods?.length??0)>0)){const authUser=await getAuthenticatedUser();let ownerId=authUser?.id||"";if(!ownerId){const fallback=await db.from("profiles").select("id").order("created_at",{ascending:true}).limit(1).maybeSingle();if(fallback.error||!fallback.data)throw fallback.error||new Error("店舗付加情報を保存できるプロフィールがありません");ownerId=fallback.data.id}const metadata=await db.from("store_requests").insert({user_id:ownerId,status:"metadata",payload:{metadataType:"store_provisional_brands",storeId:result.data.id,brandIds:provisionalBrandIds,openingTime:row.openingTime||"",closingTime:row.closingTime||"",businessHours,customName:row.customName===true,stationNames}});if(metadata.error)throw metadata.error}
      savedData = { id: result.data.id, name: result.data.name, chain: result.data.chain_name ?? "", type: result.data.store_type, address: result.data.address, latitude: result.data.latitude, longitude: result.data.longitude,openingDate:result.data.opening_date??"",closingDate:result.data.closing_date??"",customName:row.customName===true,stationNames,createdAt:result.data.created_at,provisionalBrandIds,businessHours };
    }
    return NextResponse.json({ ok: true, data: savedData });
  } catch (error) { return NextResponse.json({ error: errorMessage(error) }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  if (!(await authorized())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  try {
    const body = await request.json() as { entity: Entity; data: Brand | Chain | Product | Store | Station | RailwayCompany };
    const db = createSupabaseAdminClient();
    let result;
    if (body.entity === "station") {
      const stationNameRaw = (body.data as Station).name.replace(/[\s　]+/g, " ").trim().slice(0, 50);
      if (!stationNameRaw) return NextResponse.json({ error: "削除する駅名タグを確認できませんでした" }, { status: 400 });
      const stationName = stationNameRaw.endsWith("駅") ? stationNameRaw : `${stationNameRaw}駅`;

      const authUser = await getAuthenticatedUser();
      let ownerId = authUser?.id ?? "";
      if (!ownerId) {
        const fallback = await db.from("profiles").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
        if (fallback.error || !fallback.data) throw fallback.error || new Error("駅名タグを削除できるプロフィールがありません");
        ownerId = fallback.data.id;
      }

      const metadataRows = await readLatestCatalogMetadata(db, ["store_provisional_brands", "railway_line_directory"], true);
      const latestMetadataByEntity = new Map<string, (typeof metadataRows)[number]>();
      for (const item of metadataRows) {
        const payload = item.payload && typeof item.payload === "object" && !Array.isArray(item.payload) ? item.payload as Record<string, unknown> : {};
        const entityKey = typeof payload.storeId === "string"
          ? `store:${payload.storeId}`
          : typeof payload.lineName === "string"
            ? `line:${payload.lineName}`
            : "";
        if (entityKey) latestMetadataByEntity.set(entityKey, item);
      }
      const latestMetadataRows = [...latestMetadataByEntity.values()];
      const linkedStoreIds = latestMetadataRows.flatMap((item) => {
        const payload = item.payload && typeof item.payload === "object" && !Array.isArray(item.payload) ? item.payload as Record<string, unknown> : {};
        return typeof payload.storeId === "string" && Array.isArray(payload.stationNames) && payload.stationNames.includes(stationName)
          ? [payload.storeId]
          : [];
      });
      if (linkedStoreIds.length) {
        const linkedStores = await db.from("stores").select("id", { count: "exact", head: true }).in("id", linkedStoreIds).eq("is_active", true);
        if (linkedStores.error) throw linkedStores.error;
        if ((linkedStores.count ?? 0) > 0) {
          return NextResponse.json({ error: `この駅名タグは${linkedStores.count}店舗で使用中です。先に店舗の駅名タグを変更してください。` }, { status: 409 });
        }
      }

      const replacements: { user_id: string; status: "metadata"; payload: Record<string, unknown> }[] = latestMetadataRows.flatMap((item) => {
        const payload = item.payload && typeof item.payload === "object" && !Array.isArray(item.payload) ? item.payload as Record<string, unknown> : {};
        if (payload.isActive === false || payload.metadataType !== "railway_line_directory" || typeof payload.lineName !== "string" || !Array.isArray(payload.stationNames) || !payload.stationNames.includes(stationName)) return [];
        return [{ user_id: item.user_id ?? ownerId, status: "metadata" as const, payload: { ...payload, stationNames: payload.stationNames.filter((name) => name !== stationName) } }];
      });
      replacements.push({ user_id: ownerId, status: "metadata", payload: { metadataType: "station_directory", stationName, prefecture: "", municipality: "", lineNames: [], isActive: false } });
      const retired = await db.from("store_requests").insert(replacements);
      if (retired.error) throw retired.error;
      return NextResponse.json({ ok: true, updatedLines: replacements.length - 1 });
    }
    if (body.entity === "railwayCompany") {
      const companyName=(body.data as RailwayCompany).name.replace(/[\s　]+/g," ").trim().slice(0,80);if(!companyName)return NextResponse.json({error:"削除する鉄道会社を確認できませんでした"},{status:400});
      const authUser=await getAuthenticatedUser();let ownerId=authUser?.id||"";if(!ownerId){const fallback=await db.from("profiles").select("id").order("created_at",{ascending:true}).limit(1).maybeSingle();if(fallback.error||!fallback.data)throw fallback.error||new Error("鉄道会社情報を削除できるプロフィールがありません");ownerId=fallback.data.id}
      const metadataRows=await readLatestCatalogMetadata(db,["railway_line_directory"],true);
      const replacements:{user_id:string;status:"metadata";payload:Record<string,unknown>}[]=metadataRows.flatMap(item=>{const payload=item.payload&&typeof item.payload==="object"&&!Array.isArray(item.payload)?item.payload as Record<string,unknown>:{};if(payload.isActive===false||payload.metadataType!=="railway_line_directory"||typeof payload.lineName!=="string")return[];const companies=Array.isArray(payload.companies)?payload.companies.filter((name):name is string=>typeof name==="string"):typeof payload.company==="string"?[payload.company]:[];if(!companies.includes(companyName))return[];return[{user_id:item.user_id??ownerId,status:"metadata" as const,payload:{...payload,companies:companies.filter(name=>name!==companyName),company:null}}]});
      replacements.push({user_id:ownerId,status:"metadata",payload:{metadataType:"railway_company_directory",companyName,regions:[],isActive:false}});
      const retired=await db.from("store_requests").insert(replacements);if(retired.error)throw retired.error;
      return NextResponse.json({ok:true,updatedLines:replacements.length-1});
    }
    if (body.entity === "brand") result = await db.from("brands").delete().eq("name", (body.data as Brand).name);
    else if (body.entity === "chain") result = await db.from("store_chains").delete().eq("name", (body.data as Chain).name);
    else if (body.entity === "store") { const row = body.data as Store; result = await db.from("stores").delete().eq("name", row.name).eq("address", row.address); }
    else { const row = body.data as Product; result = await db.from("products").delete().eq("brand_id", await getBrandId(row.brand)).eq("name", row.name); }
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "削除に失敗しました" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  if (!(await authorized())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  const body = await request.json().catch(() => null) as { kind?: "product" | "store"; id?: string; status?: "approved" | "rejected"; productId?:string; productVariantId?:string|null } | null;
  if (!body || (body.kind !== "product" && body.kind !== "store") || !body.id || !UUID_PATTERN.test(body.id) || (body.status !== "approved" && body.status !== "rejected")) return NextResponse.json({ error: "更新内容が不正です" }, { status: 400 });
  const table = body.kind === "product" ? "product_requests" : "store_requests";
  const db=createSupabaseAdminClient();
  const pending=await db.from(table).select("id,user_id,payload,created_at").eq("id",body.id).eq("status","pending").maybeSingle();
  if(pending.error)return NextResponse.json({error:"申請内容を確認できませんでした"},{status:500});
  if(!pending.data)return NextResponse.json({ error: "審査待ちの申請が見つかりません" }, { status: 404 });
  const result = await db.from(table).update({ status: body.status }).eq("id", body.id).eq("status", "pending").select("id").maybeSingle();
  if (result.error) return NextResponse.json({ error: "申請状態を更新できませんでした" }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "審査待ちの申請が見つかりません" }, { status: 404 });
  if(body.kind==="product"&&body.status==="approved"){
    const payload=pending.data.payload&&typeof pending.data.payload==="object"&&!Array.isArray(pending.data.payload)?pending.data.payload as Record<string,unknown>:{};
    const storeId=typeof payload.reportStoreId==="string"?payload.reportStoreId:"";const method=typeof payload.reportMethod==="string"?payload.reportMethod:"";const reportStatus=payload.reportStatus==="sold_out"?"sold_out":"available";
    if(storeId){
      const methods=new Set(["store_visit","staff_confirmation","phone","official_information"]);
      if(!body.productId||!UUID_PATTERN.test(body.productId)||(body.productVariantId!=null&&!UUID_PATTERN.test(body.productVariantId))||!UUID_PATTERN.test(storeId)||!methods.has(method)){await db.from(table).update({status:"pending"}).eq("id",body.id);return NextResponse.json({error:"在庫報告へ反映する商品・店舗を確認できませんでした"},{status:400});}
      const [product,variant,store]=await Promise.all([db.from("products").select("id").eq("id",body.productId).eq("is_active",true).maybeSingle(),body.productVariantId?db.from("product_variants").select("id").eq("id",body.productVariantId).eq("product_id",body.productId).maybeSingle():Promise.resolve({data:null,error:null}),operatingPeriodQuery(db.from("stores").select("id").eq("id",storeId).eq("is_active",true)).maybeSingle()]);
      if(product.error||variant.error||store.error||!product.data||(body.productVariantId&&!variant.data)||!store.data){await db.from(table).update({status:"pending"}).eq("id",body.id);return NextResponse.json({error:"在庫報告の対象を確認できませんでした"},{status:400});}
      const comment=typeof payload.reportComment==="string"?payload.reportComment.slice(0,200)||null:null;const reportedAt=typeof payload.reportReportedAt==="string"&&!Number.isNaN(Date.parse(payload.reportReportedAt))?payload.reportReportedAt:pending.data.created_at;
      const report=await db.from("stock_reports").insert({product_id:body.productId,product_variant_id:body.productVariantId||null,store_id:storeId,user_id:pending.data.user_id,status:reportStatus,confirmation_method:method,comment,reported_at:reportedAt});
      if(report.error){await db.from(table).update({status:"pending"}).eq("id",body.id);return NextResponse.json({error:"商品は登録しましたが、在庫報告への反映に失敗しました。もう一度承認してください"},{status:500});}
    }
  }
  return NextResponse.json({ ok: true });
}
