import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAuthenticatedAdmin, isSameOrigin } from "@/lib/server/security";
import { UUID_PATTERN } from "@/lib/server/validation";
import { isValidOperatingDate, operatingPeriodQuery } from "@/lib/store-operating-period";

type Entity = "brand" | "chain" | "product" | "store";
type Brand = { name: string; nameKana?: string };
type Chain = { name: string; storeType: string };
type Product = { brand: string; name: string; category: string; additionalCategories?:string[]; janCode?: string; additionalJanCodes?:string[]; releaseDate?:string; spf?:number|null; pa?:string|null; variants: { name: string; colorCode?: string; janCode?: string; releaseDate?:string }[] };
type StoreHours=Record<string,{openingTime:string;closingTime:string;closed:boolean}>;
type Store = { id?: string; name: string; chain?: string; type: string; address: string; latitude: number; longitude: number; customName?:boolean; stationNames?:string[]; createdAt?:string; provisionalBrandIds?:string[]; openingTime?:string; closingTime?:string; openingDate?:string; closingDate?:string; businessHours?:StoreHours };
function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "保存に失敗しました";
}

async function authorized() {
  return isAuthenticatedAdmin();
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  try {
    const db = createSupabaseAdminClient();
    const [brandsResult, chainsResult, productsResult, storesResult, productRequestsResult, storeRequestsResult] = await Promise.all([
      db.from("brands").select("id,name,name_kana").order("name"),
      db.from("store_chains").select("id,name,store_type").eq("is_active", true).order("name"),
      db.from("products").select("id,name,category,additional_categories,jan_code,additional_jan_codes,release_date,spf,pa,created_at,brands(name),product_variants(id,variant_name,color_code,jan_code,release_date)").eq("is_active", true).order("name").order("created_at", { referencedTable: "product_variants" }),
      db.from("stores").select("id,name,chain_name,store_type,address,latitude,longitude,opening_date,closing_date,created_at").eq("is_active", true).order("name"),
      db.from("product_requests").select("id,user_id,payload,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(1000),
      db.from("store_requests").select("id,payload,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(1000),
    ]);
    const error = brandsResult.error || chainsResult.error || productsResult.error || storesResult.error || productRequestsResult.error || storeRequestsResult.error;
    if (error) throw error;
    const metadataResult=await db.from("store_requests").select("payload,created_at").eq("status","metadata").order("created_at",{ascending:true});if(metadataResult.error)throw metadataResult.error;
    const storeMetadata=new Map<string,{brandIds:string[];openingTime:string;closingTime:string;businessHours:StoreHours;customName:boolean;stationNames:string[]}>();
    for(const item of metadataResult.data??[]){
      const payload=item.payload as{storeId?:string;brandIds?:unknown;openingTime?:unknown;closingTime?:unknown;businessHours?:unknown;customName?:unknown;stationNames?:unknown};
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
    type ProductRow = { id: string; name: string; category: string; additional_categories:string[]|null; jan_code: string | null; additional_jan_codes:string[]|null; release_date:string|null;spf:number|null;pa:string|null;created_at:string; brands: { name: string } | { name: string }[] | null; product_variants: { id: string; variant_name: string; color_code: string | null; jan_code: string | null; release_date:string|null }[] };
    const productRows = (productsResult.data ?? []) as unknown as ProductRow[];
    const requestStoreNames=new Map((storesResult.data??[]).map(store=>[store.id,[store.chain_name,store.name].filter(Boolean).join(" ")]));
    return NextResponse.json({
      ok: true,
      brands: (brandsResult.data ?? []).map((row) => ({ id: row.id, name: row.name, nameKana: row.name_kana ?? "" })),
      chains: (chainsResult.data ?? []).map((row) => ({ id: row.id, name: row.name, storeType: row.store_type })),
      products: productRows.map((row) => ({ id: row.id, brand: Array.isArray(row.brands) ? row.brands[0]?.name ?? "" : row.brands?.name ?? "", name: row.name, category: row.category, additionalCategories:row.additional_categories??[], janCode: row.jan_code ?? "", additionalJanCodes:row.additional_jan_codes??[], releaseDate:row.release_date??"",spf:row.spf,pa:row.pa,createdAt:row.created_at,variants: row.product_variants.map((variant) => ({ id: variant.id, name: variant.variant_name === variant.color_code ? "" : variant.variant_name, colorCode: variant.color_code ?? "", janCode: variant.jan_code ?? "",releaseDate:variant.release_date??"" })) })),
      stores: (storesResult.data ?? []).map((row) => {const metadata=storeMetadata.get(row.id);return { id: row.id, name: row.name, chain: row.chain_name ?? "", type: row.store_type, address: row.address, latitude: row.latitude, longitude: row.longitude,openingDate:row.opening_date??"",closingDate:row.closing_date??"",customName:metadata?.customName??false,stationNames:metadata?.stationNames??[],createdAt:row.created_at,provisionalBrandIds:metadata?.brandIds??[],openingTime:metadata?.openingTime??"",closingTime:metadata?.closingTime??"",businessHours:metadata?.businessHours??{} }}),
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
    const body = await request.json() as { entity: Entity; data: Brand | Chain | Product | Store; previous?: Brand | Chain | Product | Store };
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
      const row = body.data as Product; const previous = body.previous as Product | undefined; const currentBrandId = await getBrandId(row.brand); let productId = "";
      const primaryJanCode = row.janCode?.trim() || null;
      const additionalJanCodes = [...new Set((row.additionalJanCodes??[]).map((code)=>code.trim()).filter((code)=>code&&code!==primaryJanCode))].slice(0,30);
      if(row.variants.some((variant)=>!variant.name.trim()&&!variant.colorCode?.trim()&&Boolean(variant.janCode?.trim()||variant.releaseDate?.trim())))throw new Error("カラー名または色番がないバリエーション行があります");
      if (previous) {
        const previousBrandId = await getBrandId(previous.brand);
        const found = await db.from("products").select("id").eq("brand_id", previousBrandId).eq("name", previous.name).maybeSingle();
        if (found.error) throw found.error;
        if (found.data) { productId = found.data.id; const updated = await db.from("products").update({ brand_id: currentBrandId, name: row.name.trim(), category: row.category, additional_categories:[...new Set((row.additionalCategories??[]).filter(category=>category&&category!==row.category))], jan_code:primaryJanCode,additional_jan_codes:additionalJanCodes,release_date:row.releaseDate||null,spf:Number.isFinite(row.spf)?row.spf:null,pa:["+","++","+++","++++"].includes(row.pa||"")?row.pa:null,is_active: true }).eq("id", productId); if (updated.error) throw updated.error; }
      }
      if (!productId) { const saved = await db.from("products").upsert({ brand_id: currentBrandId, name: row.name.trim(), category: row.category, additional_categories:[...new Set((row.additionalCategories??[]).filter(category=>category&&category!==row.category))], jan_code:primaryJanCode,additional_jan_codes:additionalJanCodes,release_date:row.releaseDate||null,spf:Number.isFinite(row.spf)?row.spf:null,pa:["+","++","+++","++++"].includes(row.pa||"")?row.pa:null,is_active: true }, { onConflict: "brand_id,name" }).select("id").single(); if (saved.error) throw saved.error; productId = saved.data.id; }
      const removed = await db.from("product_variants").delete().eq("product_id", productId); if (removed.error) throw removed.error;
      const variants = row.variants.filter((variant) => variant.name.trim() || variant.colorCode?.trim()).map((variant, index) => { const colorCode=variant.colorCode?.trim()||null;return { product_id: productId, variant_name: variant.name.trim() || colorCode!, color_code: colorCode, jan_code: variant.janCode || null,release_date:variant.releaseDate||null,created_at:new Date(Date.now()+index).toISOString() }});
      if (variants.length) { const inserted = await db.from("product_variants").insert(variants); if (inserted.error) throw inserted.error; }
      const confirmedVariants=await db.from("product_variants").select("id,variant_name,color_code,jan_code,release_date").eq("product_id",productId).order("created_at");if(confirmedVariants.error)throw confirmedVariants.error;
      savedData={id:productId,brand:row.brand,name:row.name.trim(),category:row.category,additionalCategories:[...new Set((row.additionalCategories??[]).filter(category=>category&&category!==row.category))],janCode:primaryJanCode??"",additionalJanCodes,releaseDate:row.releaseDate||"",spf:Number.isFinite(row.spf)?row.spf:null,pa:["+","++","+++","++++"].includes(row.pa||"")?row.pa:null,variants:(confirmedVariants.data??[]).map(variant=>({id:variant.id,name:variant.variant_name===variant.color_code?"":variant.variant_name,colorCode:variant.color_code??"",janCode:variant.jan_code??"",releaseDate:variant.release_date??""}))};
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
      const provisionalBrandIds=(row.provisionalBrandIds??[]).filter(Boolean);const businessHours=Object.fromEntries(["mon","tue","wed","thu","fri","sat","sun"].map(day=>{const hours=row.businessHours?.[day];return[day,{openingTime:/^\d{2}:\d{2}$/.test(hours?.openingTime??"")?hours!.openingTime:"",closingTime:/^\d{2}:\d{2}$/.test(hours?.closingTime??"")?hours!.closingTime:"",closed:hours?.closed===true}]})) as StoreHours;
      const stationNames=[...new Set((row.stationNames??[]).map(name=>name.replace(/[\s　]+/g," ").trim().slice(0,50)).filter(Boolean).map(name=>name.endsWith("駅")?name:`${name}駅`))].slice(0,12);
      if(Boolean(previous)||provisionalBrandIds.length>0||row.customName===true||stationNames.length>0||Object.values(businessHours).some(hours=>hours.closed||hours.openingTime||hours.closingTime)){const authUser=await getAuthenticatedUser();let ownerId=authUser?.id||"";if(!ownerId){const fallback=await db.from("profiles").select("id").order("created_at",{ascending:true}).limit(1).maybeSingle();if(fallback.error||!fallback.data)throw fallback.error||new Error("店舗付加情報を保存できるプロフィールがありません");ownerId=fallback.data.id}const metadata=await db.from("store_requests").insert({user_id:ownerId,status:"metadata",payload:{metadataType:"store_provisional_brands",storeId:result.data.id,brandIds:provisionalBrandIds,openingTime:row.openingTime||"",closingTime:row.closingTime||"",businessHours,customName:row.customName===true,stationNames}});if(metadata.error)throw metadata.error}
      savedData = { id: result.data.id, name: result.data.name, chain: result.data.chain_name ?? "", type: result.data.store_type, address: result.data.address, latitude: result.data.latitude, longitude: result.data.longitude,openingDate:result.data.opening_date??"",closingDate:result.data.closing_date??"",customName:row.customName===true,stationNames,createdAt:result.data.created_at,provisionalBrandIds,businessHours };
    }
    return NextResponse.json({ ok: true, data: savedData });
  } catch (error) { return NextResponse.json({ error: errorMessage(error) }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  if (!(await authorized())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  try {
    const body = await request.json() as { entity: Entity; data: Brand | Chain | Product | Store }; const db = createSupabaseAdminClient(); let result;
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
    const storeId=typeof payload.reportStoreId==="string"?payload.reportStoreId:"";const method=typeof payload.reportMethod==="string"?payload.reportMethod:"";
    if(storeId){
      const methods=new Set(["store_visit","staff_confirmation","phone","official_information"]);
      if(!body.productId||!UUID_PATTERN.test(body.productId)||(body.productVariantId!=null&&!UUID_PATTERN.test(body.productVariantId))||!UUID_PATTERN.test(storeId)||!methods.has(method)){await db.from(table).update({status:"pending"}).eq("id",body.id);return NextResponse.json({error:"在庫報告へ反映する商品・店舗を確認できませんでした"},{status:400});}
      const [product,variant,store]=await Promise.all([db.from("products").select("id").eq("id",body.productId).eq("is_active",true).maybeSingle(),body.productVariantId?db.from("product_variants").select("id").eq("id",body.productVariantId).eq("product_id",body.productId).maybeSingle():Promise.resolve({data:null,error:null}),operatingPeriodQuery(db.from("stores").select("id").eq("id",storeId).eq("is_active",true)).maybeSingle()]);
      if(product.error||variant.error||store.error||!product.data||(body.productVariantId&&!variant.data)||!store.data){await db.from(table).update({status:"pending"}).eq("id",body.id);return NextResponse.json({error:"在庫報告の対象を確認できませんでした"},{status:400});}
      const comment=typeof payload.reportComment==="string"?payload.reportComment.slice(0,200)||null:null;const reportedAt=typeof payload.reportReportedAt==="string"&&!Number.isNaN(Date.parse(payload.reportReportedAt))?payload.reportReportedAt:pending.data.created_at;
      const report=await db.from("stock_reports").insert({product_id:body.productId,product_variant_id:body.productVariantId||null,store_id:storeId,user_id:pending.data.user_id,status:"available",confirmation_method:method,comment,reported_at:reportedAt});
      if(report.error){await db.from(table).update({status:"pending"}).eq("id",body.id);return NextResponse.json({error:"商品は登録しましたが、在庫報告への反映に失敗しました。もう一度承認してください"},{status:500});}
    }
  }
  return NextResponse.json({ ok: true });
}
