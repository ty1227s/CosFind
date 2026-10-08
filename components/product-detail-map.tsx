"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatStoreName } from "@/lib/store-name";
import { readCurrentLocation, saveCurrentLocation } from "@/lib/current-location";

export type ProductMapStore = { id:string;name:string;chain:string;customName?:boolean;address:string;latitude:number;longitude:number;reportStatus:"available"|"unavailable"|"unreported";lastReportedAt:string|null };

export function ProductDetailMap({ stores }: { stores: ProductMapStore[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState("");
  const selected = stores.find((store) => store.id === selectedId);
  useEffect(() => {
    let disposed = false; let map: import("maplibre-gl").Map | null = null; let markers: import("maplibre-gl").Marker[] = []; let currentMarker: import("maplibre-gl").Marker | null = null; let watchId: number | undefined; let centeredOnLiveLocation = false;
    void import("maplibre-gl").then((maplibre) => {
      if (disposed || !container.current) return;
      const savedLocation = readCurrentLocation();
      const storeCenter = stores.length ? [stores.reduce((sum, store) => sum + store.longitude, 0) / stores.length, stores.reduce((sum, store) => sum + store.latitude, 0) / stores.length] as [number, number] : [139.7006, 35.6896] as [number, number];
      const center = savedLocation ? [savedLocation.longitude, savedLocation.latitude] as [number, number] : storeCenter;
      const createdMap = new maplibre.Map({ container: container.current, center, zoom: savedLocation ? 14 : 12, style: { version: 8, sources: { osm: { type: "raster", tiles: [process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] }, attributionControl: { compact: true } });
      map = createdMap;
      createdMap.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      markers = stores.map((store) => { const status = store.reportStatus; const label = status === "available" ? "商品あり" : status === "unavailable" ? "商品なし" : "報告なし"; const symbol = status === "available" ? "✓" : status === "unavailable" ? "×" : "−"; const element = document.createElement("button"); element.type = "button"; element.className = `product-map-pin ${status === "available" ? "available-pin" : status === "unavailable" ? "unavailable-pin" : "no-report-pin"}`; element.title = `${formatStoreName(store)}（${label}）`; element.setAttribute("aria-label", element.title); element.innerHTML = `<span>${symbol}</span>`; element.onclick = () => setSelectedId(store.id); return new maplibre.Marker({ element, anchor: "bottom" }).setLngLat([store.longitude, store.latitude]).addTo(createdMap); });
      if (!savedLocation && stores.length > 1) { const bounds = new maplibre.LngLatBounds(); stores.forEach((store) => bounds.extend([store.longitude,store.latitude])); createdMap.fitBounds(bounds, { padding:55,maxZoom:15,duration:0 }); }
      if (navigator.geolocation) watchId=navigator.geolocation.watchPosition(({coords})=>{
        if(disposed||!map)return;
        saveCurrentLocation(coords.latitude,coords.longitude);
        const position:[number,number]=[coords.longitude,coords.latitude];
        if(!currentMarker){const element=document.createElement("div");element.className="current-location-marker";element.title="現在地";element.setAttribute("aria-label","現在地");element.innerHTML="<span></span>";currentMarker=new maplibre.Marker({element,anchor:"center"}).setLngLat(position).addTo(map)}else currentMarker.setLngLat(position);
        if(!centeredOnLiveLocation){centeredOnLiveLocation=true;map.easeTo({center:position,zoom:14,duration:700})}
      },()=>undefined,{enableHighAccuracy:true,maximumAge:60000,timeout:10000});
    });
    return () => { disposed = true; if(watchId!==undefined)navigator.geolocation.clearWatch(watchId);currentMarker?.remove();markers.forEach((marker) => marker.remove());map?.remove(); };
  }, [stores]);
  const selectedLabel = selected?.reportStatus === "available" ? "✓ 商品あり" : selected?.reportStatus === "unavailable" ? "× 商品なし" : "− 報告なし";
  return <div className="product-map-shell"><div ref={container} className="product-detail-map" aria-label="この商品の店舗別報告状況地図"/><div className="product-map-legend"><span><i className="available-pin"/>✓ 商品あり</span><span><i className="unavailable-pin"/>× 商品なし</span><span><i className="no-report-pin"/>− 報告なし</span></div>{selected&&<article className={`product-map-card ${selected.reportStatus}`}><button type="button" onClick={() => setSelectedId("")} aria-label="閉じる">×</button><small>{selectedLabel}</small><h3>{formatStoreName(selected)}</h3><p>{selected.address}</p>{selected.lastReportedAt&&<b>最終情報提供：{new Date(selected.lastReportedAt).toLocaleDateString("ja-JP")}</b>}<Link href={`/stores/${selected.id}`}>店舗詳細を見る</Link></article>}</div>;
}
