"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapView } from "./map-view";
import { stores } from "@/lib/mock-data";
import { catalogRepository, usesSupabaseCatalog } from "@/lib/data";
import { LocationSelect } from "./location-select";
import { calculateDistanceKm, readLocalCatalog } from "@/lib/local-catalog";
import { formatStoreName } from "@/lib/store-name";
import { getStoreTypeColor } from "@/lib/store-type-color";
import { HeaderNav } from "./header-nav";
import { FavoriteButton } from "./favorite-button";
import { AuthenticatedOnly } from "./authenticated-only";
import { getStoreOpenStatus } from "@/lib/store-hours";
import { HeaderProductSearch } from "./header-product-search";

const fmt=(iso:string)=>new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));
export function CosFindApp(){
 const [selected,setSelected]=useState(usesSupabaseCatalog?"":stores[0].id); const [sort,setSort]=useState("near"); const [sheet,setSheet]=useState(false);
 const [prefecture,setPrefecture]=useState(""); const [municipality,setMunicipality]=useState("");
 const [storeResults,setStoreResults]=useState(usesSupabaseCatalog?[]:stores);
 const [visibleStoreIds,setVisibleStoreIds]=useState<string[]|null>(null);
 const [currentLocation,setCurrentLocation]=useState<{latitude:number;longitude:number}|null>(null);
 const [closingCard,setClosingCard]=useState(false);
 const [currentTime,setCurrentTime]=useState(()=>new Date());
 const [panelCollapsed,setPanelCollapsed]=useState(false);
 const [openNowOnly,setOpenNowOnly]=useState(false);
 useEffect(()=>{if(usesSupabaseCatalog)return;const load=()=>{const local=readLocalCatalog();setStoreResults(local.stores);setSelected(current=>local.stores.some(s=>s.id===current)?current:(local.stores[0]?.id||""));navigator.geolocation?.getCurrentPosition(({coords})=>setStoreResults(current=>current.map(store=>({...store,distanceKm:calculateDistanceKm(coords.latitude,coords.longitude,store.latitude,store.longitude)}))),()=>undefined,{enableHighAccuracy:false,maximumAge:300000,timeout:5000})};load();window.addEventListener("storage",load);window.addEventListener("focus",load);return()=>{window.removeEventListener("storage",load);window.removeEventListener("focus",load)}},[]);
 useEffect(()=>{if(!usesSupabaseCatalog)return;let active=true;let inFlight=false;const load=async()=>{if(!active||inFlight)return;inFlight=true;try{const rows=await catalogRepository.getStores();if(active){setStoreResults(rows);setSelected(current=>rows.some(s=>s.id===current)?current:"")}}catch{}finally{inFlight=false}};const loadWhenVisible=()=>{if(document.visibilityState==="visible")void load()};void load();const timer=window.setInterval(loadWhenVisible,5000);window.addEventListener("focus",loadWhenVisible);document.addEventListener("visibilitychange",loadWhenVisible);return()=>{active=false;window.clearInterval(timer);window.removeEventListener("focus",loadWhenVisible);document.removeEventListener("visibilitychange",loadWhenVisible)}},[]);
 const mapStores=useMemo(()=>storeResults.map(store=>currentLocation?{...store,distanceKm:calculateDistanceKm(currentLocation.latitude,currentLocation.longitude,store.latitude,store.longitude)}:store).filter(s=>(!prefecture||s.address.includes(prefecture))&&(!municipality||s.address.includes(municipality))&&(!openNowOnly||["open","closing-soon"].includes(getStoreOpenStatus(s.businessHours,currentTime)?.state??""))).sort((a,b)=>sort==="near"&&currentLocation?a.distanceKm-b.distanceKm:b.lastReportedAt.localeCompare(a.lastReportedAt)),[sort,storeResults,prefecture,municipality,currentLocation,openNowOnly,currentTime]);
 const visibleStoreIdSet=useMemo(()=>visibleStoreIds===null?null:new Set(visibleStoreIds),[visibleStoreIds]);
 const shown=useMemo(()=>visibleStoreIdSet===null?mapStores:mapStores.filter(store=>visibleStoreIdSet.has(store.id)),[mapStores,visibleStoreIdSet]);
 const active=mapStores.find(s=>s.id===selected);
 const activeBusinessStatus=getStoreOpenStatus(active?.businessHours,currentTime);
 useEffect(()=>{const timer=window.setInterval(()=>setCurrentTime(new Date()),30000);return()=>window.clearInterval(timer)},[]);
 const choose=useCallback((id:string)=>{setSelected(id);setSheet(false)},[]);
 const closeMapCard=useCallback(()=>{setClosingCard(true);window.setTimeout(()=>{setSelected("");setClosingCard(false)},180)},[]);
 const updateVisibleStores=useCallback((ids:string[])=>setVisibleStoreIds(current=>current?.length===ids.length&&current.every((id,index)=>id===ids[index])?current:ids),[]);
 return <main className={`app-shell${active?" store-popup-open":""}`}>
  <header className="topbar"><Link href="/" className="brandmark"><span className="logo"><Image src="/icons/cosfind-icon.png" alt="" width={40} height={40} priority/></span><span><b>CosFind</b></span></Link><HeaderProductSearch/><HeaderNav/></header>
  <section className={`workspace${panelCollapsed?" panel-collapsed":""}`}>
   <aside id="store-search-panel" className={`panel ${sheet?"sheet-open":""}`}><button className="sheet-handle" onClick={()=>setSheet(v=>!v)} aria-label="店舗一覧を開閉"><span/></button>
    <LocationSelect compact prefecture={prefecture} municipality={municipality} onPrefectureChange={setPrefecture} onMunicipalityChange={setMunicipality}/>
    <div className="map-store-filters"><label><input type="checkbox" checked={openNowOnly} onChange={event=>setOpenNowOnly(event.target.checked)}/><span><b>現在営業中のみ表示</b><small>営業時間が登録されている店舗から絞り込みます</small></span></label></div>
    <div className="list-head"><div><h2>店舗一覧</h2><span>{shown.length}件を表示</span></div><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="並び替え"><option value="fresh">情報が新しい順</option><option value="near">現在地から近い順</option></select></div>
    <div className="store-list">{shown.slice(0,10).map((s,i)=>{const color=getStoreTypeColor(s.type);const reported=s.reportCount>0;return <button className={`store-card ${selected===s.id?"selected":""}`} key={s.id} onClick={()=>choose(s.id)}><div className="store-index" style={{backgroundColor:color.background,color:color.foreground}} title={s.type}>{i+1}</div><div className="store-copy"><span className="store-type-label">{s.type}</span><h3>{formatStoreName(s)}</h3><p>{s.address}</p>{Boolean(s.stationNames?.length)&&<div className="station-tags compact">{s.stationNames!.slice(0,3).map(name=><span key={name}>{name}</span>)}</div>}<div className="meta"><span>最終情報 <b>{reported?fmt(s.lastReportedAt):"報告なし"}</b></span><span>{currentLocation?`${s.distanceKm.toFixed(1)} km`:"距離未取得"}</span></div></div><span className="chev">›</span></button>})}</div>
   </aside>
   <section className="map-area"><button className="panel-toggle" type="button" onClick={()=>setPanelCollapsed(value=>!value)} aria-expanded={!panelCollapsed} aria-controls="store-search-panel" aria-label={panelCollapsed?"店舗一覧を表示":"店舗一覧を非表示"}><span>{panelCollapsed?"›":"‹"}</span></button><MapView stores={mapStores} selected={selected} onSelect={choose} onVisibleStoresChange={updateVisibleStores} onCurrentLocationChange={setCurrentLocation}/>{active&&<article key={active.id} className={`map-card${closingCard?" is-closing":""}`}><button className="close" onClick={closeMapCard}>×</button><span className="store-type-label">{active.type}</span>{activeBusinessStatus&&<span className={`business-status ${activeBusinessStatus.state}`}>{activeBusinessStatus.label}</span>}<h3>{formatStoreName(active)}</h3><p>{active.address}</p>{Boolean(active.stationNames?.length)&&<div className="station-tags">{active.stationNames!.map(name=><Link href={`/stations/${encodeURIComponent(name)}`} key={name}>{name}</Link>)}</div>}<FavoriteButton kind="store" id={active.id} compact/><div className="datebox"><small>店舗の最新報告</small><b>最終情報提供：{active.reportCount>0?fmt(active.lastReportedAt):"報告なし"}</b></div><div className="card-actions"><Link href={`/stores/${active.id}`}>店舗詳細</Link><AuthenticatedOnly><Link href={`/report?store=${active.id}`}>✦ ここで見つけた</Link></AuthenticatedOnly></div></article>}</section>
  </section>
 </main>
}
