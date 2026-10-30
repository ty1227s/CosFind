import "server-only";
import { cache } from "react";
import municipalitySource from "@/lib/municipalities.generated.json";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { operatingPeriodQuery } from "@/lib/store-operating-period";
import { isRailwayRegion } from "@/lib/railway-regions";
import { readLatestCatalogMetadata } from "@/lib/server/catalog-metadata";
import { fetchAllSupabaseRows } from "@/lib/supabase-pagination";
import { normalizeJapaneseAddress, prefectureFromAddress } from "@/lib/japanese-address";

type MunicipalitySource = Record<string, string[]>;
type StoreRow = {
  id: string;
  name: string;
  chain_name: string | null;
  store_type: string;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
};
type MetadataPayload = { metadataType?: unknown; storeId?: unknown; customName?: unknown; stationNames?: unknown; stationName?: unknown; prefecture?: unknown; municipality?: unknown; lineName?: unknown; lineNames?: unknown; pageGroupCanonicalName?: unknown; pageGroupStationNames?: unknown; companies?: unknown; company?: unknown; companyName?: unknown; regions?: unknown; visualType?: unknown; imageUrl?: unknown; lineColor?: unknown; isActive?: unknown };

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
  createdAt: string;
};
export type MunicipalityDirectory = { name: string; stores: AreaStore[] };
export type PrefectureDirectory = { name: string; municipalities: MunicipalityDirectory[]; storeCount: number };
export type StationDirectory = { name: string; prefecture: string; municipality: string; lineNames: string[]; stores: AreaStore[]; pageGroupCanonicalName: string; pageGroupStationNames: string[] };
export type RailwayLineDirectory = { name: string; companies: string[]; visualType: "image" | "color"; imageUrl: string; lineColor: string; stations: StationDirectory[] };
export type RailwayCompanyDirectory = { name: string; regions: string[]; lineCount: number };

const municipalities = municipalitySource as MunicipalitySource;
const prefectureOrder = Object.keys(municipalities);
type MetadataRow = { payload: unknown; created_at: string };
const DIRECTORY_CACHE_TTL_MS = 30_000;
function timedCache<T>(loader: () => Promise<T>) {
  let cached: { expiresAt: number; promise: Promise<T> } | undefined;
  return () => {
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.promise;
    const promise = loader().catch((error) => {
      if (cached?.promise === promise) cached = undefined;
      throw error;
    });
    cached = { expiresAt: now + DIRECTORY_CACHE_TTL_MS, promise };
    return promise;
  };
}
const loadDirectoryMetadataRows = timedCache(async (): Promise<MetadataRow[]> => {
  const db = createSupabaseAdminClient();
  try {
    return await readLatestCatalogMetadata(db, ["store_provisional_brands", "station_directory", "railway_line_directory", "railway_company_directory"]);
  } catch (error) {
    const message = error instanceof Error ? error.message : error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "不明なエラー";
    throw new Error(`地域・駅・路線情報の取得に失敗しました: ${message}`);
  }
});
const getDirectoryMetadataRows = cache(loadDirectoryMetadataRows);
const municipalityCandidates = Object.fromEntries(
  Object.entries(municipalities).map(([prefecture, values]) => [
    prefecture,
    [...values].sort((left, right) => right.length - left.length),
  ]),
) as MunicipalitySource;

function identifyArea(address: string) {
  const normalized = normalizeJapaneseAddress(address);
  const prefecture = prefectureFromAddress(normalized);
  if (!prefecture) return null;
  const remainder = normalized.slice(prefecture.length);
  const municipality = municipalityCandidates[prefecture]?.find((candidate) => remainder.startsWith(candidate));
  return municipality ? { prefecture, municipality } : null;
}

const loadAreaDirectory = timedCache(async (): Promise<PrefectureDirectory[]> => {
  const db = createSupabaseAdminClient();
  const [storeRows, metadataRows] = await Promise.all([
    fetchAllSupabaseRows<StoreRow>((from,to)=>operatingPeriodQuery(
      db
        .from("stores")
        .select("id,name,chain_name,store_type,address,latitude,longitude,created_at")
        .eq("is_active", true),
    ).order("id").range(from,to)),
    getDirectoryMetadataRows(),
  ]);

  const customNames = new Map<string, boolean>();
  const stationNames = new Map<string, string[]>();
  for (const row of metadataRows) {
    const payload = row.payload as MetadataPayload | null;
    const storeId = typeof payload?.storeId === "string" ? payload.storeId : "";
    if (storeId && typeof payload?.customName === "boolean") {
      customNames.set(storeId, payload.customName);
    }
    if (storeId && Array.isArray(payload?.stationNames)) {
      stationNames.set(storeId, payload.stationNames.filter((name): name is string => typeof name === "string"));
    }
  }

  const groups = new Map<string, Map<string, AreaStore[]>>();
  for (const row of storeRows) {
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
      createdAt: row.created_at,
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
export const getAreaDirectory = cache(loadAreaDirectory);

export function findPrefecture(directory: PrefectureDirectory[], name: string) {
  return directory.find((item) => item.name === name);
}

export function findMunicipality(prefecture: PrefectureDirectory, name: string) {
  return prefecture.municipalities.find((item) => item.name === name);
}

const loadStationDirectory = timedCache(async (): Promise<StationDirectory[]> => {
  const [areaDirectory, metadataRows] = await Promise.all([
    getAreaDirectory(),
    getDirectoryMetadataRows(),
  ]);
  const stationLines = new Map<string, { prefecture: string; municipality: string; lineNames: string[]; pageGroupCanonicalName: string; pageGroupStationNames: string[]; isActive: boolean }>();
  for (const row of metadataRows) {
    const payload = row.payload as MetadataPayload | null;
    if (payload?.metadataType !== "station_directory" || typeof payload.stationName !== "string") continue;
    const pageGroupStationNames = Array.isArray(payload.pageGroupStationNames) ? payload.pageGroupStationNames.filter((name): name is string => typeof name === "string") : [];
    stationLines.set(payload.stationName, {
      prefecture: typeof payload.prefecture === "string" ? payload.prefecture : "",
      municipality: typeof payload.municipality === "string" ? payload.municipality : "",
      lineNames: Array.isArray(payload.lineNames) ? payload.lineNames.filter((name): name is string => typeof name === "string") : [],
      pageGroupCanonicalName: typeof payload.pageGroupCanonicalName === "string" ? payload.pageGroupCanonicalName : payload.stationName,
      pageGroupStationNames: pageGroupStationNames.length ? pageGroupStationNames : [payload.stationName],
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
  const stationNames = new Set([...stationLines.entries()].filter(([, metadata]) => metadata.isActive).map(([name]) => name));
  for (const name of stationStores.keys()) stationNames.add(name);
  return [...stationNames]
    .filter((name) => stationLines.get(name)?.isActive !== false)
    .map((name) => ({ name, prefecture: stationLines.get(name)?.prefecture ?? "", municipality: stationLines.get(name)?.municipality ?? "", lineNames: stationLines.get(name)?.lineNames ?? [], stores: [...(stationStores.get(name)?.values() ?? [])].sort((left, right) => left.name.localeCompare(right.name, "ja")), pageGroupCanonicalName: stationLines.get(name)?.pageGroupCanonicalName ?? name, pageGroupStationNames: stationLines.get(name)?.pageGroupStationNames ?? [name] }))
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
});
export const getStationDirectory = cache(loadStationDirectory);

export function stationPageDisplayName(stationNames: string[]) {
  const names = [...new Set(stationNames.filter(Boolean))];
  if (names.length < 2) return names[0] ?? "";
  return `${names.map((name) => name.endsWith("駅") ? name.slice(0, -1) : name).join("・")}駅`;
}

export function resolveStationPage(directory: StationDirectory[], stationName: string) {
  const requested = directory.find((station) => station.name === stationName);
  if (!requested) return null;
  const memberNames = requested.pageGroupStationNames.length > 1 ? requested.pageGroupStationNames : [requested.name];
  const members = memberNames.map((name) => directory.find((station) => station.name === name)).filter((station): station is StationDirectory => Boolean(station));
  const canonicalName = members.some((station) => station.name === requested.pageGroupCanonicalName) ? requested.pageGroupCanonicalName : members[0]?.name ?? requested.name;
  const stores = new Map<string, AreaStore>();
  for (const member of members) for (const store of member.stores) stores.set(store.id, store);
  const canonical = members.find((station) => station.name === canonicalName) ?? requested;
  return {
    requestedName: stationName,
    canonicalName,
    displayName: stationPageDisplayName(members.map((station) => station.name)),
    memberNames: members.map((station) => station.name),
    station: {
      ...canonical,
      lineNames: [...new Set(members.flatMap((station) => station.lineNames))],
      stores: [...stores.values()].sort((left, right) => left.name.localeCompare(right.name, "ja")),
      pageGroupCanonicalName: canonicalName,
      pageGroupStationNames: members.map((station) => station.name),
    },
  };
}

const loadRailwayLineDirectory = timedCache(async (): Promise<RailwayLineDirectory[]> => {
  const stationsPromise = getStationDirectory();
  const [stations, metadataRows]=await Promise.all([stationsPromise,getDirectoryMetadataRows()]);
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
  const membersByLine = new Map<string, StationDirectory[]>();
  for (const station of stations) for (const lineName of station.lineNames) {
    const members = membersByLine.get(lineName) ?? [];
    members.push(station);
    membersByLine.set(lineName, members);
  }
  return [...names].map((name) => {
    const members = [...(membersByLine.get(name) ?? [])];
    const preferredOrder = configuredLines.get(name)?.stationNames ?? [];
    const preferredIndexes = new Map(preferredOrder.map((stationName, index) => [stationName, index]));
    members.sort((left, right) => {
      const leftIndex = preferredIndexes.get(left.name); const rightIndex = preferredIndexes.get(right.name);
      if (leftIndex !== undefined && rightIndex !== undefined) return leftIndex - rightIndex;
      if (leftIndex !== undefined) return -1; if (rightIndex !== undefined) return 1;
      return left.name.localeCompare(right.name, "ja");
    });
    return { name, companies:configuredLines.get(name)?.companies??[], visualType:configuredLines.get(name)?.visualType??"color", imageUrl:configuredLines.get(name)?.imageUrl??"", lineColor:configuredLines.get(name)?.lineColor??"", stations: members };
  }).sort((left, right) => left.name.localeCompare(right.name, "ja"));
});
export const getRailwayLineDirectory = cache(loadRailwayLineDirectory);

const loadRailwayCompanyDirectory = timedCache(async (): Promise<RailwayCompanyDirectory[]> => {
  const [lines, metadataRows] = await Promise.all([getRailwayLineDirectory(), getDirectoryMetadataRows()]);
  const configured = new Map<string, { regions: string[]; isActive: boolean }>();
  for (const row of metadataRows) {
    const payload = row.payload as MetadataPayload | null;
    if (payload?.metadataType !== "railway_company_directory" || typeof payload.companyName !== "string") continue;
    configured.set(payload.companyName, {
      regions: Array.isArray(payload.regions) ? [...new Set(payload.regions.filter((region): region is string => typeof region === "string" && isRailwayRegion(region)))] : [],
      isActive: payload.isActive !== false,
    });
  }
  const names = new Set(lines.flatMap((line) => line.companies));
  for (const [name, metadata] of configured) if (metadata.isActive) names.add(name);
  const lineCounts = new Map<string, number>();
  for (const line of lines) for (const company of line.companies) lineCounts.set(company, (lineCounts.get(company) ?? 0) + 1);
  return [...names]
    .filter((name) => configured.get(name)?.isActive !== false)
    .map((name) => ({ name, regions: configured.get(name)?.regions ?? [], lineCount: lineCounts.get(name) ?? 0 }))
    .sort((left, right) => left.name.localeCompare(right.name, "ja"));
});
export const getRailwayCompanyDirectory = cache(loadRailwayCompanyDirectory);

const loadDirectorySitemapEntries = timedCache(async () => {
  const db = createSupabaseAdminClient();
  const [storeRows, metadataRows] = await Promise.all([
    fetchAllSupabaseRows<Pick<StoreRow,"id"|"address"|"created_at">>((from,to)=>operatingPeriodQuery(db.from("stores").select("id,address,created_at").eq("is_active", true)).order("id").range(from,to)),
    getDirectoryMetadataRows(),
  ]);

  const areaKeys = new Set<string>();
  const stores: { id: string; createdAt: string }[] = [];
  for (const store of storeRows) {
    stores.push({ id: store.id, createdAt: store.created_at });
    const area = identifyArea(store.address || "");
    if (area) areaKeys.add(`${area.prefecture}\u0000${area.municipality}`);
  }

  const stationStates = new Map<string, { active: boolean; lineNames: string[]; pageGroupCanonicalName: string }>();
  const stationsFromStores = new Set<string>();
  const lineStates = new Map<string, boolean>();
  for (const row of metadataRows) {
    const payload = row.payload as MetadataPayload | null;
    if (payload?.metadataType === "station_directory" && typeof payload.stationName === "string") {
      stationStates.set(payload.stationName, { active: payload.isActive !== false, lineNames: Array.isArray(payload.lineNames) ? payload.lineNames.filter((name): name is string => typeof name === "string") : [], pageGroupCanonicalName: typeof payload.pageGroupCanonicalName === "string" ? payload.pageGroupCanonicalName : payload.stationName });
    } else if (payload?.metadataType === "railway_line_directory" && typeof payload.lineName === "string") {
      lineStates.set(payload.lineName, payload.isActive !== false);
    } else if (typeof payload?.storeId === "string" && Array.isArray(payload.stationNames)) {
      for (const name of payload.stationNames) if (typeof name === "string" && name) stationsFromStores.add(name);
    }
  }
  const stationNames = new Set([...stationsFromStores].filter((name) => stationStates.get(name)?.active !== false).map((name) => stationStates.get(name)?.pageGroupCanonicalName || name));
  const lineNames = new Set<string>();
  for (const stationName of stationNames) {
    const state = stationStates.get(stationName);
    if (!state?.active) continue;
    for (const lineName of state.lineNames) if (lineStates.get(lineName) !== false) lineNames.add(lineName);
  }

  return {
    areas: [...areaKeys].map((key) => { const [prefecture, municipality] = key.split("\u0000"); return { prefecture, municipality }; }),
    stores,
    stationNames: [...stationNames],
    lineNames: [...lineNames],
  };
});
export const getDirectorySitemapEntries = cache(loadDirectorySitemapEntries);

export { areaHref, stationHref, railwayLineHref, decodeAreaSegment, publicSiteOrigin } from "./area-links";
