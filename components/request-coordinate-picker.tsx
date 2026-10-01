"use client";

import { useEffect, useRef, useState } from "react";
import { parseCoordinatePair } from "@/lib/coordinates";

type Position = { latitude: number; longitude: number };

export function RequestCoordinatePicker({ address }: { address: string }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const positionRef = useRef<Position | null>(null);
  const searchSequence = useRef(0);
  const addressSearchTimer = useRef<number | null>(null);
  const pastedForAddress = useRef<string | null>(null);
  const [message, setMessage] = useState("地図をクリックして店舗位置にピンを立ててください（必須）");
  const [coordinateText, setCoordinateText] = useState("");
  const [coordinateMessage, setCoordinateMessage] = useState("");

  function setPin(longitude: number, latitude: number, preservePrecision = false) {
    const next = preservePrecision ? { longitude, latitude } : { longitude: Number(longitude.toFixed(6)), latitude: Number(latitude.toFixed(6)) };
    setPosition(next);
    positionRef.current = next;
    if (!markerRef.current && mapRef.current && maplibreRef.current) {
      markerRef.current = new maplibreRef.current.Marker({ color: "#c32673", draggable: true }).setLngLat([next.longitude, next.latitude]).addTo(mapRef.current);
      markerRef.current.on("dragend", () => { const point = markerRef.current?.getLngLat(); if (point) setPin(point.lng, point.lat); });
    }
    else markerRef.current?.setLngLat([next.longitude, next.latitude]);
    setMessage("ピン位置を設定しました。クリックまたはドラッグで調整できます");
  }

  useEffect(() => {
    let disposed = false;
    void import("maplibre-gl").then((module) => {
      const maplibre = module;
      if (disposed || !container.current) return;
      maplibreRef.current = module;
      const map = new maplibre.Map({ container: container.current, center: [139.7006, 35.6896], zoom: 12, style: { version: 8, sources: { osm: { type: "raster", tiles: [process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] }, attributionControl: { compact: true } });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.on("click", (event) => setPin(event.lngLat.lng, event.lngLat.lat));
      mapRef.current = map;
      const currentPosition = positionRef.current;
      if (currentPosition) setPin(currentPosition.longitude, currentPosition.latitude);
    });
    return () => { disposed = true; markerRef.current?.remove(); markerRef.current = null; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  async function locateAddress(value = address) {
    const query = value.trim();
    if (!query) return setMessage("住所は空欄でも構いません。地図上で位置を指定してください");
    const sequence = ++searchSequence.current;
    setMessage("住所を検索中…");
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("geocode failed");
      const result = await response.json() as { latitude?: number; longitude?: number; matchedQuery?: string; precision?: "full" | "street" | "town" };
      if (sequence !== searchSequence.current) return;
      if (typeof result.latitude !== "number" || typeof result.longitude !== "number") return setMessage("住所を特定できません。都道府県・市区町村・町名・番地の順で確認してください");
      setPin(result.longitude, result.latitude); mapRef.current?.flyTo({ center: [result.longitude, result.latitude], zoom: 16 });
      if (result.precision !== "full") setMessage(`${result.matchedQuery || "町名"}の代表位置です。地図で店舗位置を確認してください`);
    } catch { if (sequence === searchSequence.current) setMessage("住所検索に失敗しました。再検索するか地図で位置を指定してください"); }
  }

  useEffect(() => {
    if (addressSearchTimer.current !== null) window.clearTimeout(addressSearchTimer.current);
    const normalizedAddress = address.trim();
    if (pastedForAddress.current === normalizedAddress) return;
    pastedForAddress.current = null;
    if (normalizedAddress.length < 4) return;
    addressSearchTimer.current = window.setTimeout(() => void locateAddress(address), 900);
    return () => { if (addressSearchTimer.current !== null) window.clearTimeout(addressSearchTimer.current); };
  }, [address]);

  function applyCoordinateText(value: string) {
    setCoordinateText(value);
    if (!value.trim()) { setCoordinateMessage(""); return; }
    const parsed = parseCoordinatePair(value);
    if (!parsed) { setCoordinateMessage("「緯度, 経度」の順で貼り付けてください"); return; }
    searchSequence.current += 1;
    if (addressSearchTimer.current !== null) window.clearTimeout(addressSearchTimer.current);
    pastedForAddress.current = address.trim();
    setPin(parsed.longitude, parsed.latitude, true);
    mapRef.current?.flyTo({ center: [parsed.longitude, parsed.latitude], zoom: 17, essential: true });
    setCoordinateMessage("座標をピンと申請内容へ反映しました");
  }

  function useCurrentLocation() { navigator.geolocation?.getCurrentPosition(({ coords }) => { setPin(coords.longitude, coords.latitude); mapRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 16 }); }, () => setMessage("現在地を取得できません。地図上で位置を指定してください")); }

  return <div className="coordinate-picker"><div className="coordinate-head"><div><b>店舗位置のピン（必須）</b><small>{message}</small></div><span className="coordinate-actions"><button type="button" onClick={() => void locateAddress()}>住所から検索</button><button type="button" onClick={useCurrentLocation}>◎ 現在地</button></span></div><label className="coordinate-paste"><span>Google Mapsの座標を貼り付け</span><input value={coordinateText} onChange={(event) => applyCoordinateText(event.target.value)} placeholder="35.60844897527208, 139.73217222082997" inputMode="text"/><small data-error={coordinateMessage.includes("順で") || undefined}>{coordinateMessage || "緯度, 経度をまとめて貼り付けると即時反映します"}</small></label><div ref={container} className="coordinate-map"/><div className="coordinate-values"><label>緯度<input name="latitude" value={position?.latitude ?? ""} readOnly required placeholder="ピンを指定"/></label><label>経度<input name="longitude" value={position?.longitude ?? ""} readOnly required placeholder="ピンを指定"/></label></div></div>;
}
