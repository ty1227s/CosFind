"use client";

import { useEffect, useRef, useState } from "react";
import { parseCoordinatePair } from "@/lib/coordinates";

export function CoordinatePicker({ initialLatitude = 35.6896, initialLongitude = 139.7006, address = "", autoGeocodeAddress = true }: { initialLatitude?: number; initialLongitude?: number; address?: string; autoGeocodeAddress?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const [position, setPosition] = useState({ latitude: initialLatitude, longitude: initialLongitude });
  const positionRef = useRef(position);
  const searchSequence = useRef(0);
  const addressSearchTimer = useRef<number | null>(null);
  const pastedForAddress = useRef<string | null>(null);
  const lastObservedAddress = useRef(address.trim());
  const [geocodeState, setGeocodeState] = useState<"idle" | "searching" | "found" | "missing" | "error">("idle");
  const [matchedQuery, setMatchedQuery] = useState("");
  const [coordinateText, setCoordinateText] = useState("");
  const [coordinateMessage, setCoordinateMessage] = useState("");

  useEffect(() => { positionRef.current = position; }, [position]);

  useEffect(() => {
    const next = { latitude: initialLatitude, longitude: initialLongitude };
    setPosition(next);
    positionRef.current = next;
    markerRef.current?.setLngLat([next.longitude, next.latitude]);
    mapRef.current?.jumpTo({ center: [next.longitude, next.latitude] });
  }, [initialLatitude, initialLongitude]);

  useEffect(() => {
    let disposed = false;
    void import("maplibre-gl").then((maplibre) => {
      if (disposed || !container.current) return;
      const currentPosition = positionRef.current;
      const map = new maplibre.Map({
        container: container.current,
        center: [currentPosition.longitude, currentPosition.latitude],
        zoom: 15,
        style: { version: 8, sources: { osm: { type: "raster", tiles: [process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] },
        attributionControl: { compact: true },
      });
      const marker = new maplibre.Marker({ color: "#c32673", draggable: true }).setLngLat([currentPosition.longitude, currentPosition.latitude]).addTo(map);
      const update = (longitude: number, latitude: number) => setPosition({ longitude: Number(longitude.toFixed(6)), latitude: Number(latitude.toFixed(6)) });
      marker.on("dragend", () => { const point = marker.getLngLat(); update(point.lng, point.lat); });
      map.on("click", (event) => { marker.setLngLat(event.lngLat); update(event.lngLat.lng, event.lngLat.lat); });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibre.ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");
      mapRef.current = map; markerRef.current = marker;
    });
    return () => { disposed = true; mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
  }, [initialLatitude, initialLongitude]);

  async function locateAddress(value: string) {
    const query = value.trim();
    if (query.length < 4) return;
    const sequence = ++searchSequence.current;
    setGeocodeState("searching");
    setMatchedQuery("");
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("geocode failed");
      const result = await response.json() as { latitude?: number; longitude?: number; matchedQuery?: string; precision?: "full" | "street" | "town" };
      if (sequence !== searchSequence.current) return;
      if (typeof result.latitude !== "number" || typeof result.longitude !== "number") { setGeocodeState("missing"); return; }
      const next = { latitude: Number(result.latitude.toFixed(6)), longitude: Number(result.longitude.toFixed(6)) };
      setPosition(next);
      positionRef.current = next;
      markerRef.current?.setLngLat([next.longitude, next.latitude]);
      mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 16, essential: true });
      setMatchedQuery(result.precision === "full" ? "" : result.matchedQuery || "町名付近");
      setGeocodeState("found");
    } catch { if (sequence === searchSequence.current) setGeocodeState("error"); }
  }

  useEffect(() => {
    if (addressSearchTimer.current !== null) window.clearTimeout(addressSearchTimer.current);
    const normalizedAddress = address.trim();
    if (!autoGeocodeAddress) {
      lastObservedAddress.current = normalizedAddress;
      return;
    }
    if (normalizedAddress === lastObservedAddress.current) return;
    lastObservedAddress.current = normalizedAddress;
    if (pastedForAddress.current === normalizedAddress) return;
    pastedForAddress.current = null;
    if (normalizedAddress.length < 4) { setGeocodeState("idle"); return; }
    addressSearchTimer.current = window.setTimeout(() => void locateAddress(address), 900);
    return () => { if (addressSearchTimer.current !== null) window.clearTimeout(addressSearchTimer.current); };
  }, [address, autoGeocodeAddress]);

  function applyCoordinateText(value: string) {
    setCoordinateText(value);
    if (!value.trim()) { setCoordinateMessage(""); return; }
    const parsed = parseCoordinatePair(value);
    if (!parsed) { setCoordinateMessage("「緯度, 経度」の順で貼り付けてください"); return; }
    searchSequence.current += 1;
    if (addressSearchTimer.current !== null) window.clearTimeout(addressSearchTimer.current);
    pastedForAddress.current = address.trim();
    setPosition(parsed);
    positionRef.current = parsed;
    markerRef.current?.setLngLat([parsed.longitude, parsed.latitude]);
    mapRef.current?.flyTo({ center: [parsed.longitude, parsed.latitude], zoom: 17, essential: true });
    setCoordinateMessage("座標をピンと保存値へ反映しました");
  }

  function useCurrentLocation() {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const next = { latitude: Number(coords.latitude.toFixed(6)), longitude: Number(coords.longitude.toFixed(6)) };
      setPosition(next); markerRef.current?.setLngLat([next.longitude, next.latitude]); mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 16 });
    });
  }

  return <div className="coordinate-picker">
    <div className="coordinate-head"><div><b>住所から店舗位置を設定</b><small>{geocodeState === "searching" ? "住所を検索中…" : geocodeState === "found" ? matchedQuery ? `${matchedQuery}の代表位置にピンを移動しました。番地・建物位置は地図で確認してください` : "住所に合わせてピンを移動しました" : geocodeState === "missing" ? "住所を特定できません。都道府県・市区町村・町名・番地の順で確認してください" : geocodeState === "error" ? "住所検索に失敗しました。再検索するか地図で調整してください" : "入力が止まると自動検索します。地図クリックやドラッグで微調整できます"}</small></div><span className="coordinate-actions"><button type="button" onClick={() => void locateAddress(address)}>住所を再検索</button><button type="button" onClick={useCurrentLocation}>◎ 現在地</button></span></div>
    <label className="coordinate-paste"><span>Google Mapsの座標を貼り付け</span><input value={coordinateText} onChange={(event) => applyCoordinateText(event.target.value)} placeholder="35.60844897527208, 139.73217222082997" inputMode="text"/><small data-error={coordinateMessage.includes("順で") || undefined}>{coordinateMessage || "緯度, 経度をまとめて貼り付けると即時反映します"}</small></label>
    <div ref={container} className="coordinate-map" />
    <div className="coordinate-values"><label>緯度<input name="latitude" type="number" step="any" value={position.latitude} onChange={(e) => setPosition((value) => ({ ...value, latitude: Number(e.target.value) }))} required/></label><label>経度<input name="longitude" type="number" step="any" value={position.longitude} onChange={(e) => setPosition((value) => ({ ...value, longitude: Number(e.target.value) }))} required/></label></div>
  </div>;
}
