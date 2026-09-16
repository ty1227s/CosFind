"use client";

import { useEffect, useRef, useState } from "react";

type Position = { latitude: number; longitude: number };

export function RequestCoordinatePicker({ address }: { address: string }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [message, setMessage] = useState("地図をクリックして店舗位置にピンを立ててください（必須）");

  function setPin(longitude: number, latitude: number) {
    const next = { longitude: Number(longitude.toFixed(6)), latitude: Number(latitude.toFixed(6)) };
    setPosition(next);
    if (!markerRef.current && mapRef.current && maplibreRef.current) markerRef.current = new maplibreRef.current.Marker({ color: "#c32673", draggable: true }).setLngLat([next.longitude, next.latitude]).addTo(mapRef.current);
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
    });
    return () => { disposed = true; markerRef.current?.remove(); markerRef.current = null; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const update = () => { const point = marker.getLngLat(); setPin(point.lng, point.lat); };
    marker.on("dragend", update);
    return () => { marker.off("dragend", update); };
  }, [position !== null]);

  async function locateAddress() {
    if (!address.trim()) return setMessage("住所は空欄でも構いません。地図上で位置を指定してください");
    setMessage("住所を検索中…");
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(address.trim())}`);
      const result = await response.json() as { latitude?: number; longitude?: number };
      if (typeof result.latitude !== "number" || typeof result.longitude !== "number") return setMessage("住所が見つかりません。地図上で位置を指定してください");
      setPin(result.longitude, result.latitude); mapRef.current?.flyTo({ center: [result.longitude, result.latitude], zoom: 16 });
    } catch { setMessage("住所検索に失敗しました。地図上で位置を指定してください"); }
  }

  function useCurrentLocation() { navigator.geolocation?.getCurrentPosition(({ coords }) => { setPin(coords.longitude, coords.latitude); mapRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 16 }); }, () => setMessage("現在地を取得できません。地図上で位置を指定してください")); }

  return <div className="coordinate-picker"><div className="coordinate-head"><div><b>店舗位置のピン（必須）</b><small>{message}</small></div><span className="coordinate-actions"><button type="button" onClick={() => void locateAddress()}>住所から検索</button><button type="button" onClick={useCurrentLocation}>◎ 現在地</button></span></div><div ref={container} className="coordinate-map"/><div className="coordinate-values"><label>緯度<input name="latitude" value={position?.latitude ?? ""} readOnly required placeholder="ピンを指定"/></label><label>経度<input name="longitude" value={position?.longitude ?? ""} readOnly required placeholder="ピンを指定"/></label></div></div>;
}
