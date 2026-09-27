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
type MetadataPayload = { storeId?: unknown; customName?: unknown; stationNames?: unknown };

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
export type StationDirectory = { name: string; stores: AreaStore[] };

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
  const areaDirectory = await getAreaDirectory();
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
    .map(([name, stores]) => ({ name, stores: [...stores.values()].sort((left, right) => left.name.localeCompare(right.name, "ja")) }))
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
});

export function areaHref(prefecture?: string, municipality?: string) {
  if (!prefecture) return "/areas";
  const prefecturePath = `/areas/${encodeURIComponent(prefecture)}`;
  return municipality ? `${prefecturePath}/${encodeURIComponent(municipality)}` : prefecturePath;
}

export function stationHref(stationName?: string) {
  return stationName ? `/stations/${encodeURIComponent(stationName)}` : "/stations";
}

export function decodeAreaSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export const publicSiteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || "https://cosfind.ty1227s.workers.dev").replace(/\/$/, "");
