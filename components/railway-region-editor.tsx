"use client";

import { useState } from "react";
import { RAILWAY_REGIONS } from "@/lib/railway-regions";

export function RailwayRegionEditor({ initialRegions = [] }: { initialRegions?: string[] }) {
  const [regions, setRegions] = useState(() => RAILWAY_REGIONS.filter((region) => initialRegions.includes(region)));
  const [candidate, setCandidate] = useState("");
  const available = RAILWAY_REGIONS.filter((region) => !regions.includes(region));

  function add() {
    if (!candidate || regions.includes(candidate as (typeof RAILWAY_REGIONS)[number])) return;
    setRegions((current) => [...current, candidate as (typeof RAILWAY_REGIONS)[number]]);
    setCandidate("");
  }

  return <fieldset className="station-tag-editor railway-region-editor">
    <legend>地域分類（複数登録可）</legend>
    <p>その鉄道会社が路線を運行する地域を選択してください。</p>
    <div className="station-tag-input">
      <select value={candidate} onChange={(event) => setCandidate(event.target.value)} aria-label="追加する地域分類">
        <option value="">地域を選択</option>
        {available.map((region) => <option key={region} value={region}>{region}</option>)}
      </select>
      <button type="button" onClick={add} disabled={!candidate}>追加</button>
    </div>
    <div className="station-tag-list" aria-live="polite">
      {regions.map((region) => <span key={region}>{region}<input type="hidden" name="regions" value={region}/><button type="button" aria-label={`${region}を削除`} onClick={() => setRegions((current) => current.filter((item) => item !== region))}>×</button></span>)}
      {!regions.length && <small>地域分類はまだ登録されていません</small>}
    </div>
  </fieldset>;
}
