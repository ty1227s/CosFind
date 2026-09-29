import "server-only";
import { cache } from "react";
import municipalitySource from "@/lib/municipalities.generated.json";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { operatingPeriodQuery } from "@/lib/store-operating-period";

type MunicipalitySource = Record<string, string[]>;
type StoreRow = {
  id: string;
  name: string;
  chain_name: string | null;
  store_type: string;
  address: string;
  latitude: number;
  longitude: number;
};
type MetadataPayload = { metadataType?: unknown; storeId?: unknown; customName?: unknown; stationNames?: unknown; stationName?: unknown; prefecture?: unknown; municipality?: unknown; lineName?: unknown; lineNames?: unknown; companies?: unknown; company?: unknown; visualType?: unknown; imageUrl?: unknown; lineColor?: unknown; isActive?: unknown };

export type AreaStore = {
  id: string;
  name: string;
  chain: string;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
  customName: boolean;
  stationNames: string[];
};
export type MunicipalityDirectory = { name: string; stores: AreaStore[] };
export type PrefectureDirectory = { name: string; municipalities: MunicipalityDirectory[]; storeCount: number };
export type StationDirectory = { name: string; prefecture: string; municipality: string; lineNames: string[]; stores: AreaStore[] };
export type RailwayLineDirectory = { name: string; companies: string[]; visualType: "image" | "color"; imageUrl: string; lineColor: string; stations: StationDirectory[]; stores: AreaStore[] };

const municipalities = municipalitySource as MunicipalitySource;
const prefectureOrder = Object.keys(municipalities);
const municipalityCandidates = Object.fromEntries(
  Object.entries(municipalities).map(([prefecture, values]) => [
    prefecture,
    [...values].sort((left, right) => right.length - left.length),
  ]),
) as MunicipalitySource;

function identifyArea(address: string) {
  const normalized = address.replace(/[\s　]+/g, "").trim();
  const prefecture = prefectureOrder.find((candidate) => normalized.startsWith(candidate));
  if (!prefecture) return null;
  const remainder = normalized.slice(prefecture.length);
  const municipality = municipalityCandidates[prefecture]?.find((candidate) => remainder.startsWith(candidate));
  return municipality ? { prefecture, municipality } : null;
}

export const getAreaDirectory = cache(async (): Promise<PrefectureDirectory[]> => {
  const db = createSupabaseAdminClient();
  const storeQuery = operatingPeriodQuery(
    db
      .from("stores")
      .select("id,name,chain_name,store_type,address,latitude,longitude")
      .eq("is_active", true),
  );
  const [storeResult, metadataResult] = await Promise.all([
    storeQuery,
    db
      .from("store_requests")
      .select("payload,created_at")
      .eq("status", "metadata")
      .order("created_at", { ascending: false }),
  ]);
  if (storeResult.error) throw new Error(`地域別店舗情報の取得に失敗しました: ${storeResult.error.message}`);

  const customNames = new Map<string, boolean>();
  const stationNames = new Map<string, string[]>();
  for (const row of metadataResult.data ?? []) {
    const payload = row.payload as MetadataPayload | null;
    const storeId = typeof payload?.storeId === "string" ? payload.storeId : "";
    if (storeId && !customNames.has(storeId) && typeof payload?.customName === "boolean") {
      customNames.set(storeId, payload.customName);
    }
    if (storeId && !stationNames.has(storeId) && Array.isArray(payload?.stationNames)) {
      stationNames.set(storeId, payload.stationNames.filter((name): name is string => typeof name === "string"));
    }
  }

  const groups = new Map<string, Map<string, AreaStore[]>>();
  for (const row of (storeResult.data ?? []) as StoreRow[]) {
    const area = identifyArea(row.address || "");
    if (!area) continue;
    const prefectureGroup = groups.get(area.prefecture) ?? new Map<string, AreaStore[]>();
    const municipalityGroup = prefectureGroup.get(area.municipality) ?? [];
    municipalityGroup.push({
      id: row.id,
      name: row.name,
      chain: row.chain_name ?? "",
      type: row.store_type,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      customName: customNames.get(row.id) === true,
      stationNames: stationNames.get(row.id) ?? [],
    });
    prefectureGroup.set(area.municipality, municipalityGroup);
    groups.set(area.prefecture, prefectureGroup);
  }

  return prefectureOrder.flatMap((prefecture) => {
    const prefectureGroup = groups.get(prefecture);
    if (!prefectureGroup) return [];
    const municipalityOrder = municipalities[prefecture] ?? [];
    const municipalitiesInArea = municipalityOrder.flatMap((municipality) => {
      const stores = prefectureGroup.get(municipality);
      if (!stores?.length) return [];
      stores.sort((left, right) => left.name.localeCompare(right.name, "ja"));
      return [{ name: municipality, stores }];
    });
    return [{
      name: prefecture,
      municipalities: municipalitiesInArea,
      storeCount: municipalitiesInArea.reduce((total, municipality) => total + municipality.stores.length, 0),
    }];
  });
});

export function findPrefecture(directory: PrefectureDirectory[], name: string) {
  return directory.find((item) => item.name === name);
}

export function findMunicipality(prefecture: PrefectureDirectory, name: string) {
  return prefecture.municipalities.find((item) => item.name === name);
}

export const getStationDirectory = cache(async (): Promise<StationDirectory[]> => {
  const [areaDirectory, stationMetadataResult] = await Promise.all([
    getAreaDirectory(),
    createSupabaseAdminClient().from("store_requests").select("payload,created_at").eq("status", "metadata").order("created_at", { ascending: true }),
  ]);
  if (stationMetadataResult.error) throw new Error(`駅・路線情報の取得に失敗しました: ${stationMetadataResult.error.message}`);
  const stationLines = new Map<string, { prefecture: string; municipality: string; lineNames: string[]; isActive: boolean }>();
  for (const row of stationMetadataResult.data ?? []) {
    const payload = row.payload as MetadataPayload | null;
    if (payload?.metadataType !== "station_directory" || typeof payload.stationName !== "string") continue;
    stationLines.set(payload.stationName, {
      prefecture: typeof payload.prefecture === "string" ? payload.prefecture : "",
      municipality: typeof payload.municipality === "string" ? payload.municipality : "",
      lineNames: Array.isArray(payload.lineNames) ? payload.lineNames.filter((name): name is string => typeof name === "string") : [],
      isActive: payload.isActive !== false,
    });
  }
  const stationStores = new Map<string, Map<string, AreaStore>>();
  for (const prefecture of areaDirectory) {
    for (const municipality of prefecture.municipalities) {
      for (const store of municipality.stores) {
        for (const stationName of store.stationNames) {
          const stores = stationStores.get(stationName) ?? new Map<string, AreaStore>();
          stores.set(store.id, store);
          stationStores.set(stationName, stores);
        }
      }
    }
  }
  return [...stationStores.entries()]
    .filter(([name]) => stationLines.get(name)?.isActive !== false)
    .map(([name, stores]) => ({ name, prefecture: stationLines.get(name)?.prefecture ?? "", municipality: stationLines.get(name)?.municipality ?? "", lineNames: stationLines.get(name)?.lineNames ?? [], stores: [...stores.values()].sort((left, right) => left.name.localeCompare(right.name, "ja")) }))
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
});

export const getRailwayLineDirectory = cache(async (): Promise<RailwayLineDirectory[]> => {
  const stationsPromise = getStationDirectory();
  const db=createSupabaseAdminClient();
  const metadataRows:Array<{payload:unknown;created_at:string}>=[];
  for(let from=0;;from+=1000){
    const page=await db.from("store_requests").select("payload,created_at").eq("status", "metadata").order("created_at", { ascending: true }).range(from,from+999);
    if(page.error)throw new Error(`路線情報の取得に失敗しました: ${page.error.message}`);
    metadataRows.push(...(page.data??[]));
    if((page.data?.length??0)<1000)break;
  }
  const stations=await stationsPromise;
  const configuredLines = new Map<string, { companies:string[]; stationNames: string[]; visualType:"image"|"color"; imageUrl:string; lineColor:string; isActive: boolean }>();
  for (const row of metadataRows) {
    const payload = row.payload as MetadataPayload | null;
    if (payload?.metadataType !== "railway_line_directory" || typeof payload.lineName !== "string") continue;
    const imageUrl=typeof payload.imageUrl==="string"?payload.imageUrl:"";const lineColor=typeof payload.lineColor==="string"&&/^#[0-9a-f]{6}$/i.test(payload.lineColor)?payload.lineColor.toLowerCase():"";
    configuredLines.set(payload.lineName, {
      companies: Array.isArray(payload.companies) ? [...new Set(payload.companies.filter((name): name is string => typeof name === "string" && Boolean(name.trim())))] : typeof payload.company === "string" && payload.company.trim() ? [payload.company] : [],
      stationNames: Array.isArray(payload.stationNames) ? payload.stationNames.filter((name): name is string => typeof name === "string") : [],
      visualType:payload.visualType==="color"?"color":payload.visualType==="image"?"image":imageUrl?"image":"color",
      imageUrl,
      lineColor,
      isActive: payload.isActive !== false,
    });
  }
  const inferredNames = new Set(stations.flatMap((station) => station.lineNames));
  const names = new Set([...configuredLines.entries()].filter(([, value]) => value.isActive).map(([name]) => name));
  for (const name of inferredNames) names.add(name);
  return [...names].flatMap((name) => {
    const members = stations.filter((station) => station.lineNames.includes(name));
    if (!members.length) return [];
    const preferredOrder = configuredLines.get(name)?.stationNames ?? [];
    members.sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left.name); const rightIndex = preferredOrder.indexOf(right.name);
      if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
      if (leftIndex >= 0) return -1; if (rightIndex >= 0) return 1;
      return left.name.localeCompare(right.name, "ja");
    });
    const stores = new Map<string, AreaStore>();
    for (const station of members) for (const store of station.stores) stores.set(store.id, store);
    return [{ name, companies:configuredLines.get(name)?.companies??[], visualType:configuredLines.get(name)?.visualType??"color", imageUrl:configuredLines.get(name)?.imageUrl??"", lineColor:configuredLines.get(name)?.lineColor??"", stations: members, stores: [...stores.values()] }];
  }).sort((left, right) => left.name.localeCompare(right.name, "ja"));
});

export function areaHref(prefecture?: string, municipality?: string) {
  if (!prefecture) return "/areas";
  const prefecturePath = `/areas/${encodeURIComponent(prefecture)}`;
  return municipality ? `${prefecturePath}/${encodeURIComponent(municipality)}` : prefecturePath;
}

export function stationHref(stationName?: string) {
  return stationName ? `/stations/${encodeURIComponent(stationName)}` : "/stations";
}

export function railwayLineHref(lineName?: string) {
  return lineName ? `/lines/${encodeURIComponent(lineName)}` : "/lines";
}

export function decodeAreaSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export const publicSiteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || "https://cosfind.ty1227s.workers.dev").replace(/\/$/, "");
