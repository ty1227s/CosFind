"use client";

import { useEffect, useRef, useState } from "react";

export function CoordinatePicker({ initialLatitude = 35.6896, initialLongitude = 139.7006, address = "" }: { initialLatitude?: number; initialLongitude?: number; address?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const [position, setPosition] = useState({ latitude: initialLatitude, longitude: initialLongitude });
  const [geocodeState, setGeocodeState] = useState<"idle" | "searching" | "found" | "missing" | "error">("idle");

  useEffect(() => {
    let disposed = false;
    void import("maplibre-gl").then((maplibre) => {
      if (disposed || !container.current) return;
      const map = new maplibre.Map({
        container: container.current,
        center: [initialLongitude, initialLatitude],
        zoom: 15,
        style: { version: 8, sources: { osm: { type: "raster", tiles: [process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] },
        attributionControl: { compact: true },
      });
      const marker = new maplibre.Marker({ color: "#c32673", draggable: true }).setLngLat([initialLongitude, initialLatitude]).addTo(map);
      const update = (longitude: number, latitude: number) => setPosition({ longitude: Number(longitude.toFixed(6)), latitude: Number(latitude.toFixed(6)) });
      marker.on("dragend", () => { const point = marker.getLngLat(); update(point.lng, point.lat); });
      map.on("click", (event) => { marker.setLngLat(event.lngLat); update(event.lngLat.lng, event.lngLat.lat); });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map; markerRef.current = marker;
    });
    return () => { disposed = true; mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
  }, [initialLatitude, initialLongitude]);

  async function locateAddress(value: string) {
    const query = value.trim();
    if (query.length < 4) return;
    setGeocodeState("searching");
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("geocode failed");
      const result = await response.json() as { latitude?: number; longitude?: number };
      if (typeof result.latitude !== "number" || typeof result.longitude !== "number") { setGeocodeState("missing"); return; }
      const next = { latitude: Number(result.latitude.toFixed(6)), longitude: Number(result.longitude.toFixed(6)) };
      setPosition(next);
      markerRef.current?.setLngLat([next.longitude, next.latitude]);
      mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 16, essential: true });
      setGeocodeState("found");
    } catch { setGeocodeState("error"); }
  }

  useEffect(() => {
    if (address.trim().length < 4) { setGeocodeState("idle"); return; }
    const timer = window.setTimeout(() => void locateAddress(address), 1200);
    return () => window.clearTimeout(timer);
  }, [address]);

  function useCurrentLocation() {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const next = { latitude: Number(coords.latitude.toFixed(6)), longitude: Number(coords.longitude.toFixed(6)) };
      setPosition(next); markerRef.current?.setLngLat([next.longitude, next.latitude]); mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 16 });
    });
  }

  return <div className="coordinate-picker">
    <div className="coordinate-head"><div><b>住所から店舗位置を設定</b><small>{geocodeState === "searching" ? "住所を検索中…" : geocodeState === "found" ? "住所に合わせてピンを移動しました" : geocodeState === "missing" ? "住所が見つかりません。地図で調整してください" : geocodeState === "error" ? "住所検索に失敗しました。地図で調整してください" : "住所入力後に自動移動。地図クリックやドラッグで微調整できます"}</small></div><span className="coordinate-actions"><button type="button" onClick={() => void locateAddress(address)}>住所を再検索</button><button type="button" onClick={useCurrentLocation}>◎ 現在地</button></span></div>
    <div ref={container} className="coordinate-map" />
    <div className="coordinate-values"><label>緯度<input name="latitude" type="number" step="any" value={position.latitude} onChange={(e) => setPosition((value) => ({ ...value, latitude: Number(e.target.value) }))} required/></label><label>経度<input name="longitude" type="number" step="any" value={position.longitude} onChange={(e) => setPosition((value) => ({ ...value, longitude: Number(e.target.value) }))} required/></label></div>
  </div>;
}
