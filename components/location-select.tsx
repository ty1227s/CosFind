"use client";

import { useEffect, useMemo, useState } from "react";

type LocationMap = Record<string, string[]>;
let cachedLocations: LocationMap | null = null;

function parseCsv(text: string): LocationMap {
  const rows = text.replace(/^\uFEFF/, "").split(/\r?\n/).slice(1).map((line) => line.split(",").map((cell) => cell.trim())).filter((row) => row[0]);
  const parentsWithChildren = new Set(rows.filter((row) => row[1] && row[2] && !/(?:振興局|支庁)/.test(row[1])).map((row) => `${row[0]}\0${row[1]}`));
  const result: Record<string, Set<string>> = {};
  for (const [prefecture, parent = "", child = ""] of rows) {
    result[prefecture] ??= new Set<string>();
    const ignoredParent = /(?:振興局|支庁)/.test(parent);
    if (!child && parent && parentsWithChildren.has(`${prefecture}\0${parent}`)) continue;
    const municipality = child ? (ignoredParent ? child : `${parent}${child}`) : (ignoredParent ? "" : parent);
    if (prefecture === "東京都" && municipality === "特別区部") continue;
    if (municipality) result[prefecture].add(municipality);
    else if (child) result[prefecture].add(child);
  }
  return Object.fromEntries(Object.entries(result).map(([prefecture, values]) => [prefecture, [...values]]));
}

export function LocationSelect({ prefecture, municipality, onPrefectureChange, onMunicipalityChange, compact = false, storeAddresses, selectionMode = false, prefectureName, municipalityName }: {
  prefecture: string;
  municipality: string;
  onPrefectureChange: (value: string) => void;
  onMunicipalityChange: (value: string) => void;
  compact?: boolean;
  storeAddresses?: string[];
  selectionMode?: boolean;
  prefectureName?: string;
  municipalityName?: string;
}) {
  const [locations, setLocations] = useState<LocationMap>(cachedLocations ?? {});
  useEffect(() => {
    if (cachedLocations) return;
    void fetch("/data/municipalities.csv").then((response) => response.arrayBuffer()).then((buffer) => {
      const parsed = parseCsv(new TextDecoder("shift_jis").decode(buffer));
      cachedLocations = parsed;
      setLocations(parsed);
    });
  }, []);
  const prefectures = useMemo(() => Object.keys(locations), [locations]);
  const municipalities = useMemo(() => prefecture ? locations[prefecture] ?? [] : [], [locations, prefecture]);
  const prefectureCounts = useMemo(() => {
    const counts = Object.fromEntries(prefectures.map((name) => [name, 0])) as Record<string, number>;
    for (const address of storeAddresses ?? []) {
      const matched = prefectures.find((name) => address.includes(name));
      if (matched) counts[matched] += 1;
    }
    return counts;
  }, [prefectures, storeAddresses]);
  const municipalityCounts = useMemo(() => Object.fromEntries(municipalities.map((name) => [name, (storeAddresses ?? []).filter((address) => address.includes(prefecture) && address.includes(name)).length])), [municipalities, prefecture, storeAddresses]);
  const prefectureStoreCount = useMemo(() => (storeAddresses ?? []).filter((address) => address.includes(prefecture)).length, [prefecture, storeAddresses]);
  return <div className={compact ? "location-select compact" : "location-select"}>
    <label><span>都道府県</span><select name={prefectureName} value={prefecture} required={selectionMode} onChange={(event) => { onPrefectureChange(event.target.value); onMunicipalityChange(""); }}><option value="">{selectionMode ? "都道府県を選択" : `すべての都道府県${storeAddresses ? `（${storeAddresses.length}）` : ""}`}</option>{prefectures.map((name) => <option key={name} value={name}>{name}{storeAddresses ? `（${prefectureCounts[name]}）` : ""}</option>)}</select></label>
    <label><span>市区町村</span><select name={municipalityName} value={municipality} required={selectionMode} disabled={!prefecture} onChange={(event) => onMunicipalityChange(event.target.value)}><option value="">{selectionMode ? (prefecture ? "市区町村を選択" : "先に都道府県を選択") : `すべての市区町村${storeAddresses ? `（${prefectureStoreCount}）` : ""}`}</option>{municipalities.map((name) => <option key={name} value={name}>{name}{storeAddresses ? `（${municipalityCounts[name]}）` : ""}</option>)}</select></label>
  </div>;
}
