import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAuthenticatedAdmin, isSameOrigin } from "@/lib/server/security";
import { UUID_PATTERN } from "@/lib/server/validation";
import { isValidOperatingDate } from "@/lib/store-operating-period";

type Entity = "brand" | "chain" | "product" | "store";
type Brand = { name: string; nameKana?: string };
type Chain = { name: string; storeType: string };
type Product = { brand: string; name: string; category: string; additionalCategories?:string[]; janCode?: string; additionalJanCodes?:string[]; releaseDate?:string; spf?:number|null; pa?:string|null; variants: { name: string; colorCode?: string; janCode?: string; releaseDate?:string }[] };
type StoreHours=Record<string,{openingTime:string;closingTime:string;closed:boolean}>;
type Store = { id?: string; name: string; chain?: string; type: string; address: string; latitude: number; longitude: number; customName?:boolean; createdAt?:string; provisionalBrandIds?:string[]; openingTime?:string; closingTime?:string; openingDate?:string; closingDate?:string; businessHours?:StoreHours };
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
      db.from("products").select("id,name,category,additional_categories,jan_code,additional_jan_codes,release_date,spf,pa,created_at,brands(name),product_variants(id,variant_name,color_code,jan_code,release_date)").eq("is_active", true).order("name"),
      db.from("stores").select("id,name,chain_name,store_type,address,latitude,longitude,opening_date,closing_date,created_at").eq("is_active", true).order("name"),
      db.from("product_requests").select("id,payload,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(1000),
      db.from("store_requests").select("id,payload,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(1000),
    ]);
    const error = brandsResult.error || chainsResult.error || productsResult.error || storesResult.error || productRequestsResult.error || storeRequestsResult.error;
    if (error) throw error;
    const metadataResult=await db.from("store_requests").select("payload,created_at").eq("status","metadata").order("created_at",{ascending:true});if(metadataResult.error)throw metadataResult.error;
    const storeMetadata=new Map<string,{brandIds:string[];openingTime:string;closingTime:string;businessHours:StoreHours;customName:boolean}>();
    for(const item of metadataResult.data??[]){
      const payload=item.payload as{storeId?:string;brandIds?:unknown;openingTime?:unknown;closingTime?:unknown;businessHours?:unknown;customName?:unknown};
      if(!payload.storeId)continue;
      const previous=storeMetadata.get(payload.storeId)??{brandIds:[],openingTime:"",closingTime:"",businessHours:{},customName:false};
      storeMetadata.set(payload.storeId,{
        brandIds:Array.isArray(payload.brandIds)?payload.brandIds.filter((id):id is string=>typeof id==="string"):previous.brandIds,
        openingTime:typeof payload.openingTime==="string"?payload.openingTime:previous.openingTime,
        closingTime:typeof payload.closingTime==="string"?payload.closingTime:previous.closingTime,
        businessHours:payload.businessHours&&typeof payload.businessHours==="object"?payload.businessHours as StoreHours:previous.businessHours,
        customName:typeof payload.customName==="boolean"?payload.customName:previous.customName,
      });
    }
    type ProductRow = { id: string; name: string; category: string; additional_categories:string[]|null; jan_code: string | null; additional_jan_codes:string[]|null; release_date:string|null;spf:number|null;pa:string|null;created_at:string; brands: { name: string } | { name: string }[] | null; product_variants: { id: string; variant_name: string; color_code: string | null; jan_code: string | null; release_date:string|null }[] };
    const productRows = (productsResult.data ?? []) as unknown as ProductRow[];
    return NextResponse.json({
      ok: true,
      brands: (brandsResult.data ?? []).map((row) => ({ id: row.id, name: row.name, nameKana: row.name_kana ?? "" })),
      chains: (chainsResult.data ?? []).map((row) => ({ id: row.id, name: row.name, storeType: row.store_type })),
      products: productRows.map((row) => ({ id: row.id, brand: Array.isArray(row.brands) ? row.brands[0]?.name ?? "" : row.brands?.name ?? "", name: row.name, category: row.category, additionalCategories:row.additional_categories??[], janCode: row.jan_code ?? "", additionalJanCodes:row.additional_jan_codes??[], releaseDate:row.release_date??"",spf:row.spf,pa:row.pa,createdAt:row.created_at,variants: row.product_variants.map((variant) => ({ id: variant.id, name: variant.variant_name, colorCode: variant.color_code ?? "", janCode: variant.jan_code ?? "",releaseDate:variant.release_date??"" })) })),
      stores: (storesResult.data ?? []).map((row) => {const metadata=storeMetadata.get(row.id);return { id: row.id, name: row.name, chain: row.chain_name ?? "", type: row.store_type, address: row.address, latitude: row.latitude, longitude: row.longitude,openingDate:row.opening_date??"",closingDate:row.closing_date??"",customName:metadata?.customName??false,createdAt:row.created_at,provisionalBrandIds:metadata?.brandIds??[],openingTime:metadata?.openingTime??"",closingTime:metadata?.closingTime??"",businessHours:metadata?.businessHours??{} }}),
      productRequests: (productRequestsResult.data ?? []).map((row) => ({ ...((row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)) ? row.payload as Record<string, unknown> : {}), id: row.id, createdAt: row.created_at, status: "pending" })),
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
      if (previous) {
        const previousBrandId = await getBrandId(previous.brand);
        const found = await db.from("products").select("id").eq("brand_id", previousBrandId).eq("name", previous.name).maybeSingle();
        if (found.error) throw found.error;
        if (found.data) { productId = found.data.id; const updated = await db.from("products").update({ brand_id: currentBrandId, name: row.name.trim(), category: row.category, additional_categories:[...new Set((row.additionalCategories??[]).filter(category=>category&&category!==row.category))], jan_code:primaryJanCode,additional_jan_codes:additionalJanCodes,release_date:row.releaseDate||null,spf:Number.isFinite(row.spf)?row.spf:null,pa:["+","++","+++","++++"].includes(row.pa||"")?row.pa:null,is_active: true }).eq("id", productId); if (updated.error) throw updated.error; }
      }
      if (!productId) { const saved = await db.from("products").upsert({ brand_id: currentBrandId, name: row.name.trim(), category: row.category, additional_categories:[...new Set((row.additionalCategories??[]).filter(category=>category&&category!==row.category))], jan_code:primaryJanCode,additional_jan_codes:additionalJanCodes,release_date:row.releaseDate||null,spf:Number.isFinite(row.spf)?row.spf:null,pa:["+","++","+++","++++"].includes(row.pa||"")?row.pa:null,is_active: true }, { onConflict: "brand_id,name" }).select("id").single(); if (saved.error) throw saved.error; productId = saved.data.id; }
      const removed = await db.from("product_variants").delete().eq("product_id", productId); if (removed.error) throw removed.error;
      const variants = row.variants.filter((variant) => variant.name.trim()).map((variant) => ({ product_id: productId, variant_name: variant.name.trim(), color_code: variant.colorCode || null, jan_code: variant.janCode || null,release_date:variant.releaseDate||null }));
      if (variants.length) { const inserted = await db.from("product_variants").insert(variants); if (inserted.error) throw inserted.error; }
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
      if(Boolean(previous)||provisionalBrandIds.length>0||row.customName===true||Object.values(businessHours).some(hours=>hours.closed||hours.openingTime||hours.closingTime)){const authUser=await getAuthenticatedUser();let ownerId=authUser?.id||"";if(!ownerId){const fallback=await db.from("profiles").select("id").order("created_at",{ascending:true}).limit(1).maybeSingle();if(fallback.error||!fallback.data)throw fallback.error||new Error("店舗付加情報を保存できるプロフィールがありません");ownerId=fallback.data.id}const metadata=await db.from("store_requests").insert({user_id:ownerId,status:"metadata",payload:{metadataType:"store_provisional_brands",storeId:result.data.id,brandIds:provisionalBrandIds,openingTime:row.openingTime||"",closingTime:row.closingTime||"",businessHours,customName:row.customName===true}});if(metadata.error)throw metadata.error}
      savedData = { id: result.data.id, name: result.data.name, chain: result.data.chain_name ?? "", type: result.data.store_type, address: result.data.address, latitude: result.data.latitude, longitude: result.data.longitude,openingDate:result.data.opening_date??"",closingDate:result.data.closing_date??"",customName:row.customName===true,createdAt:result.data.created_at,provisionalBrandIds,businessHours };
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
  const body = await request.json().catch(() => null) as { kind?: "product" | "store"; id?: string; status?: "approved" | "rejected" } | null;
  if (!body || (body.kind !== "product" && body.kind !== "store") || !body.id || !UUID_PATTERN.test(body.id) || (body.status !== "approved" && body.status !== "rejected")) return NextResponse.json({ error: "更新内容が不正です" }, { status: 400 });
  const table = body.kind === "product" ? "product_requests" : "store_requests";
  const result = await createSupabaseAdminClient().from(table).update({ status: body.status }).eq("id", body.id).eq("status", "pending").select("id").maybeSingle();
  if (result.error) return NextResponse.json({ error: "申請状態を更新できませんでした" }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "審査待ちの申請が見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
