"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MAX_STATIONS = 12;
const MAX_RECENT_STATIONS = 30;
const RECENT_STATIONS_KEY = "cosfind.admin.recent-station-names.v1";

function normalizeStationName(value: string) {
  const normalized = value.replace(/[\s　]+/g, " ").trim().slice(0, 50);
  if (!normalized) return "";
  return normalized.endsWith("駅") ? normalized : `${normalized}駅`;
}

export function StationTagEditor({ initialNames = [], suggestions = [] }: { initialNames?: string[]; suggestions?: string[] }) {
  const [names, setNames] = useState(() => [...new Set(initialNames.map(normalizeStationName).filter(Boolean))].slice(0, MAX_STATIONS));
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(RECENT_STATIONS_KEY) || "[]") as unknown;
      if (Array.isArray(stored)) setRecentNames([...new Set(stored.map((value) => normalizeStationName(String(value))).filter(Boolean))].slice(0, MAX_RECENT_STATIONS));
    } catch { /* 壊れた履歴は無視して登録を続ける */ }
  }, []);

  const candidates = useMemo(() => {
    const query = input.trim().toLocaleLowerCase("ja");
    const recentRank = new Map(recentNames.map((name, index) => [name, index]));
    return [...new Set([...recentNames, ...suggestions.map(normalizeStationName).filter(Boolean)])]
      .filter((name) => !names.includes(name) && (!query || name.toLocaleLowerCase("ja").includes(query)))
      .sort((left, right) => {
        const leftRank = recentRank.get(left) ?? Number.MAX_SAFE_INTEGER;
        const rightRank = recentRank.get(right) ?? Number.MAX_SAFE_INTEGER;
        return leftRank - rightRank;
      })
      .slice(0, 8);
  }, [input, names, recentNames, suggestions]);

  function remember(values: string[]) {
    setRecentNames((current) => {
      const next = [...new Set([...values].reverse().concat(current))].slice(0, MAX_RECENT_STATIONS);
      try { window.localStorage.setItem(RECENT_STATIONS_KEY, JSON.stringify(next)); } catch { /* 保存不可でも入力自体は継続する */ }
      return next;
    });
  }

  function add(value = input) {
    const candidates = value.split(/[、,\n]/).map(normalizeStationName).filter(Boolean);
    if (!candidates.length) return;
    setNames((current) => [...new Set([...current, ...candidates])].slice(0, MAX_STATIONS));
    remember(candidates);
    setInput("");
    setFocused(true);
    inputRef.current?.focus();
  }

  return <fieldset className="station-tag-editor">
    <legend>最寄り駅・周辺駅</legend>
    <p>店舗を探すときに使われる駅名を登録してください。候補は最近使った駅から表示され、最大{MAX_STATIONS}駅まで設定できます。</p>
    <div className="station-tag-input">
      <div className="line-tag-autocomplete">
      <input ref={inputRef} value={input} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(event) => { setInput(event.target.value); setFocused(true); }} onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); add(); }
        if (event.key === "," || event.key === "、") { event.preventDefault(); add(); }
        if (event.key === "Escape") setFocused(false);
      }} placeholder="例：新宿駅" aria-label="追加する駅名" autoComplete="off" aria-expanded={focused && candidates.length > 0} disabled={names.length >= MAX_STATIONS}/>
      {focused && candidates.length > 0 && <div className="line-tag-suggestions" role="listbox" aria-label="登録済み駅名の候補">{candidates.map((name) => <button type="button" role="option" key={name} onMouseDown={(event) => { event.preventDefault(); add(name); }}>{name}</button>)}</div>}
      </div>
      <button type="button" onClick={() => add()} disabled={!input.trim() || names.length >= MAX_STATIONS}>追加</button>
    </div>
    <div className="station-tag-list station-name-tag-list" aria-live="polite">
      {names.map((name) => <span key={name}>{name}<input type="hidden" name="stationNames" value={name}/><button type="button" aria-label={`${name}を削除`} onClick={() => setNames((current) => current.filter((item) => item !== name))}>×</button></span>)}
      {!names.length && <small>駅名はまだ登録されていません</small>}
    </div>
  </fieldset>;
}
