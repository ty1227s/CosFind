"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StoreResult } from "@/types/domain";
import { getStoreTypeColor, STORE_TYPE_LEGEND } from "@/lib/store-type-color";
import { getStoreTypeCode } from "@/lib/store-type-code";
import { formatStoreName } from "@/lib/store-name";

const MAP_VIEW_KEY = "cosfind_map_view_v1";
type SavedMapView = { longitude: number; latitude: number; zoom: number };

function readSavedMapView(): SavedMapView | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(MAP_VIEW_KEY) || "null") as Partial<SavedMapView> | null;
    if (!parsed || !Number.isFinite(parsed.longitude) || !Number.isFinite(parsed.latitude) || !Number.isFinite(parsed.zoom)) return null;
    return { longitude: parsed.longitude!, latitude: parsed.latitude!, zoom: parsed.zoom! };
  } catch { return null; }
}

function isMobileMapDevice() {
  return window.matchMedia("(max-width: 700px)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function MapView({ stores, selected, focusStoresKey = "", onSelect, onVisibleStoresChange, onCurrentLocationChange }: { stores: StoreResult[]; selected?: string; focusStoresKey?: string; onSelect: (id: string) => void; onVisibleStoresChange?: (ids: string[]) => void; onCurrentLocationChange?: (location: { latitude: number; longitude: number } | null) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);
  const userMarkerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const centerTimerRef = useRef<number | undefined>(undefined);
  const legendTimerRef = useRef<number | undefined>(undefined);
  const currentPositionRef = useRef<[number, number] | null>(null);
  const fittedStoresRef = useRef("");
  const onSelectRef = useRef(onSelect);
  const onVisibleStoresChangeRef = useRef(onVisibleStoresChange);
  const onCurrentLocationChangeRef = useRef(onCurrentLocationChange);
  const [mapReady, setMapReady] = useState(false);
  const [locationState, setLocationState] = useState<"loading" | "visible" | "denied">("loading");
  const [visibleStoreCount, setVisibleStoreCount] = useState(0);
  const [visibleStoreIds, setVisibleStoreIds] = useState<string[]>([]);
  const [legendOpen, setLegendOpen] = useState(false);
  const [legendClosing, setLegendClosing] = useState(false);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onVisibleStoresChangeRef.current = onVisibleStoresChange; }, [onVisibleStoresChange]);
  useEffect(() => { onCurrentLocationChangeRef.current = onCurrentLocationChange; }, [onCurrentLocationChange]);
  const selectStore = useCallback((store: StoreResult) => {
    onSelectRef.current(store.id);
    if (!isMobileMapDevice()) return;
    if (centerTimerRef.current !== undefined) window.clearTimeout(centerTimerRef.current);
    centerTimerRef.current = window.setTimeout(() => {
      const map = mapRef.current;
      const mapElement = container.current;
      if (!map || !mapElement) return;
      const popup = mapElement.parentElement?.querySelector<HTMLElement>(".map-card");
      const mapRect = mapElement.getBoundingClientRect();
      const popupRect = popup?.getBoundingClientRect();
      const coveredHeight = popupRect ? Math.max(0, mapRect.bottom - popupRect.top) : 0;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.stop(); map.resize();
      map.flyTo({ center: [store.longitude, store.latitude], offset: [0, -coveredHeight / 2], zoom: map.getZoom(), duration: reduceMotion ? 0 : 700, essential: true });
    }, 260);
  }, []);
  const closeLegend = useCallback(() => {
    if (!legendOpen || legendClosing) return;
    setLegendClosing(true);
    legendTimerRef.current = window.setTimeout(() => { setLegendOpen(false); setLegendClosing(false); }, 180);
  }, [legendClosing, legendOpen]);
  useEffect(() => {
    if (!legendOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeLegend(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [closeLegend, legendOpen]);
  useEffect(() => () => { if (legendTimerRef.current !== undefined) window.clearTimeout(legendTimerRef.current); }, []);

  useEffect(() => {
    let disposed = false;
    let watchId: number | undefined;
    let saveMapView: (() => void) | undefined;
    const resizeTimers: number[] = [];
    const resizeMap = () => {
      if (disposed || !mapRef.current || !container.current?.clientWidth || !container.current.clientHeight) return;
      mapRef.current.resize();
    };
    void import("maplibre-gl").then((maplibre) => {
      if (disposed || !container.current) return;
      const savedView = readSavedMapView();
      const map = new maplibre.Map({ container: container.current, center: savedView ? [savedView.longitude, savedView.latitude] : [139.7006, 35.6896], zoom: savedView?.zoom ?? 13.5, style: { version: 8, sources: { osm: { type: "raster", tiles: [process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] }, attributionControl: { compact: true } });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      saveMapView = () => { const center = map.getCenter(); try { localStorage.setItem(MAP_VIEW_KEY, JSON.stringify({ longitude: center.lng, latitude: center.lat, zoom: map.getZoom() } satisfies SavedMapView)); } catch {} };
      map.on("moveend", saveMapView);
      map.on("zoomend", saveMapView);
      window.addEventListener("pagehide", saveMapView);
      window.addEventListener("beforeunload", saveMapView);
      if (savedView) map.once("load", () => map.jumpTo({ center: [savedView.longitude, savedView.latitude], zoom: savedView.zoom }));
      mapRef.current = map; setMapReady(true);
      map.once("load", resizeMap);
      resizeTimers.push(window.setTimeout(resizeMap, 250), window.setTimeout(resizeMap, 1000));
      window.addEventListener("resize", resizeMap);
      window.addEventListener("orientationchange", resizeMap);
      document.addEventListener("visibilitychange", resizeMap);
      if (!navigator.geolocation) { setLocationState("denied"); return; }
      watchId = navigator.geolocation.watchPosition(({ coords }) => {
        const position: [number, number] = [coords.longitude, coords.latitude];
        currentPositionRef.current = position;
        onCurrentLocationChangeRef.current?.({ latitude: coords.latitude, longitude: coords.longitude });
        if (!userMarkerRef.current) {
          const element = document.createElement("div"); element.className = "current-location-marker"; element.title = "現在地"; element.setAttribute("aria-label", "現在地"); element.innerHTML = "<span></span>";
          userMarkerRef.current = new maplibre.Marker({ element, anchor: "center" }).setLngLat(position).addTo(map);
        } else userMarkerRef.current.setLngLat(position);
        setLocationState("visible");
      }, () => { setLocationState("denied"); onCurrentLocationChangeRef.current?.(null); }, { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 });
    });
    return () => { disposed = true; resizeTimers.forEach((timer) => window.clearTimeout(timer)); window.removeEventListener("resize", resizeMap); window.removeEventListener("orientationchange", resizeMap); document.removeEventListener("visibilitychange", resizeMap); saveMapView?.(); if (saveMapView) { window.removeEventListener("pagehide", saveMapView); window.removeEventListener("beforeunload", saveMapView); } if (watchId !== undefined) navigator.geolocation.clearWatch(watchId); if (centerTimerRef.current !== undefined) window.clearTimeout(centerTimerRef.current); userMarkerRef.current?.remove(); userMarkerRef.current = null; markersRef.current.forEach((marker) => marker.remove()); markersRef.current = []; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !focusStoresKey || !stores.length) return;
    const signature = `${focusStoresKey}:${stores.map((store) => `${store.id}:${store.longitude}:${store.latitude}`).join("|")}`;
    if (fittedStoresRef.current === signature) return;
    let cancelled = false;
    const fitStores = async () => {
      if (cancelled || !mapRef.current) return;
      const maplibre = await import("maplibre-gl");
      if (cancelled || !mapRef.current) return;
      fittedStoresRef.current = signature;
      map.stop();
      map.resize();
      if (stores.length === 1) map.easeTo({ center: [stores[0].longitude, stores[0].latitude], zoom: 16, duration: 650 });
      else {
        const bounds = new maplibre.LngLatBounds();
        stores.forEach((store) => bounds.extend([store.longitude, store.latitude]));
        map.fitBounds(bounds, { padding: isMobileMapDevice() ? { top: 70, right: 34, bottom: 190, left: 34 } : 75, maxZoom: 16, duration: 700 });
      }
    };
    if (map.loaded()) void fitStores(); else map.once("load", fitStores);
    return () => { cancelled = true; map.off("load", fitStores); };
  }, [focusStoresKey, mapReady, stores]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    markersRef.current.forEach((marker) => marker.remove()); markersRef.current = [];
    const currentBounds = mapRef.current.getBounds();
    const markerStoreIds = visibleStoreIds.length > 0
      ? visibleStoreIds
      : stores.filter((store) => currentBounds.contains([store.longitude, store.latitude])).map((store) => store.id);
    if (markerStoreIds.length > 100) return;
    const visibleSet = new Set(markerStoreIds);
    const storesWithPins = stores.filter((store) => visibleSet.has(store.id));
    let cancelled = false;
    void import("maplibre-gl").then((maplibre) => { if (cancelled || !mapRef.current) return; markersRef.current = storesWithPins.map((store) => { const element = document.createElement("button"); const color = getStoreTypeColor(store.type); const code = getStoreTypeCode(store.type); const storeName = formatStoreName(store); element.type = "button"; element.dataset.storeId = store.id; element.className = "map-pin"; element.style.setProperty("--store-color", color.background); element.style.setProperty("--store-foreground", color.foreground); element.setAttribute("aria-label", `${storeName}、${store.type}`); element.title = storeName; element.innerHTML = `<svg viewBox="0 0 44 52" aria-hidden="true" focusable="false"><path class="store-pin-body" d="M22 1.5C11.4 1.5 3 9.9 3 20.5c0 13.7 13.3 24.6 19 30 5.7-5.4 19-16.3 19-30C41 9.9 32.6 1.5 22 1.5Z"/><text class="store-pin-code" x="22" y="21">${code}</text></svg>`; element.onclick = () => selectStore(store); return new maplibre.Marker({ element, anchor: "bottom" }).setLngLat([store.longitude, store.latitude]).addTo(mapRef.current!); }); });
    return () => { cancelled = true; markersRef.current.forEach((marker) => marker.remove()); markersRef.current = []; };
  }, [mapReady, selected, selectStore, stores, visibleStoreIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const refreshTimers: number[] = [];
    const updateVisibleStoreCount = () => {
      if (!map.getContainer().clientWidth || !map.getContainer().clientHeight) return;
      const bounds = map.getBounds();
      const visibleIds = stores.filter((store) => bounds.contains([store.longitude, store.latitude])).map((store) => store.id);
      setVisibleStoreCount(visibleIds.length);
      setVisibleStoreIds((current) => current.length === visibleIds.length && current.every((id, index) => id === visibleIds[index]) ? current : visibleIds);
      onVisibleStoresChangeRef.current?.(visibleIds);
    };
    updateVisibleStoreCount();
    map.on("moveend", updateVisibleStoreCount);
    map.on("zoomend", updateVisibleStoreCount);
    map.on("resize", updateVisibleStoreCount);
    map.once("idle", updateVisibleStoreCount);
    const refreshAfterLayout = () => { map.resize(); updateVisibleStoreCount(); };
    refreshTimers.push(window.setTimeout(refreshAfterLayout, 150), window.setTimeout(refreshAfterLayout, 700), window.setTimeout(refreshAfterLayout, 1800));
    window.visualViewport?.addEventListener("resize", refreshAfterLayout);
    window.visualViewport?.addEventListener("scroll", refreshAfterLayout);
    return () => {
      refreshTimers.forEach((timer) => window.clearTimeout(timer));
      window.visualViewport?.removeEventListener("resize", refreshAfterLayout);
      window.visualViewport?.removeEventListener("scroll", refreshAfterLayout);
      map.off("moveend", updateVisibleStoreCount);
      map.off("zoomend", updateVisibleStoreCount);
      map.off("resize", updateVisibleStoreCount);
      map.off("idle", updateVisibleStoreCount);
    };
  }, [mapReady, stores]);

  useEffect(() => { container.current?.querySelectorAll<HTMLElement>(".map-pin").forEach((pin) => { const active = pin.dataset.storeId === selected; pin.classList.toggle("active", active); pin.style.zIndex=active?"1000":"1"; }); }, [selected, visibleStoreIds]);
  function centerCurrentLocation() { const position = currentPositionRef.current; if (position) mapRef.current?.easeTo({ center: position, zoom: 15, duration: 700 }); }

  return <><div ref={container} className="map" aria-label="在庫報告店舗地図"/><button type="button" className="current-location-button" onClick={centerCurrentLocation} disabled={locationState !== "visible"} title={locationState === "denied" ? "位置情報を利用できません" : "現在地を中心に表示"}>◎ <span>{locationState === "loading" ? "現在地を取得中" : locationState === "denied" ? "現在地を利用できません" : "現在地"}</span></button><button type="button" className="map-legend-button" onClick={() => setLegendOpen(true)}>凡例</button>{visibleStoreCount > 100 && <div className="map-density-warning" role="status"><b>地図を拡大してください</b></div>}{legendOpen && createPortal(<div className={`map-legend-layer${legendClosing ? " is-closing" : ""}`}><button type="button" className="map-legend-backdrop" aria-label="凡例を閉じる" onClick={closeLegend}/><section className="map-legend-dialog" role="dialog" aria-modal="true" aria-labelledby="map-legend-title"><button type="button" className="map-legend-close" aria-label="凡例を閉じる" onClick={closeLegend}>×</button><p>MAP GUIDE</p><h2 id="map-legend-title">凡例</h2><div>{STORE_TYPE_LEGEND.map((type) => { const color = getStoreTypeColor(type); const code = getStoreTypeCode(type); return <span key={type}><i className="legend-store-code" style={{ backgroundColor: color.background, color: color.foreground }}>{code}</i><b>{type}</b></span>; })}</div></section></div>, document.body)}</>;
}
