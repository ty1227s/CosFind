"use client";

import { useState } from "react";

const MAX_STATIONS = 12;

function normalizeStationName(value: string) {
  const normalized = value.replace(/[\s　]+/g, " ").trim().slice(0, 50);
  if (!normalized) return "";
  return normalized.endsWith("駅") ? normalized : `${normalized}駅`;
}

export function StationTagEditor({ initialNames = [] }: { initialNames?: string[] }) {
  const [names, setNames] = useState(() => [...new Set(initialNames.map(normalizeStationName).filter(Boolean))].slice(0, MAX_STATIONS));
  const [input, setInput] = useState("");

  function add(value = input) {
    const candidates = value.split(/[、,\n]/).map(normalizeStationName).filter(Boolean);
    if (!candidates.length) return;
    setNames((current) => [...new Set([...current, ...candidates])].slice(0, MAX_STATIONS));
    setInput("");
  }

  return <fieldset className="station-tag-editor">
    <legend>最寄り駅・周辺駅</legend>
    <p>店舗を探すときに使われる駅名を登録してください。最大{MAX_STATIONS}駅まで設定できます。</p>
    <div className="station-tag-input">
      <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); add(); }
        if (event.key === "," || event.key === "、") { event.preventDefault(); add(); }
      }} placeholder="例：新宿駅" aria-label="追加する駅名" disabled={names.length >= MAX_STATIONS}/>
      <button type="button" onClick={() => add()} disabled={!input.trim() || names.length >= MAX_STATIONS}>追加</button>
    </div>
    <div className="station-tag-list" aria-live="polite">
      {names.map((name) => <span key={name}>{name}<input type="hidden" name="stationNames" value={name}/><button type="button" aria-label={`${name}を削除`} onClick={() => setNames((current) => current.filter((item) => item !== name))}>×</button></span>)}
      {!names.length && <small>駅名はまだ登録されていません</small>}
    </div>
  </fieldset>;
}

