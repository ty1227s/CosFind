"use client";

import { useRef, useState } from "react";

const MAX_STATIONS = 12;

function normalizeStationName(value: string) {
  const normalized = value.replace(/[\s　]+/g, " ").trim().slice(0, 50);
  if (!normalized) return "";
  return normalized.endsWith("駅") ? normalized : `${normalized}駅`;
}

export function StationTagEditor({ initialNames = [], suggestions = [] }: { initialNames?: string[]; suggestions?: string[] }) {
  const [names, setNames] = useState(() => [...new Set(initialNames.map(normalizeStationName).filter(Boolean))].slice(0, MAX_STATIONS));
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const candidates = [...new Set(suggestions.map(normalizeStationName).filter(Boolean))]
    .filter((name) => !names.includes(name) && (!input.trim() || name.toLocaleLowerCase("ja").includes(input.trim().toLocaleLowerCase("ja"))))
    .slice(0, 8);

  function add(value = input) {
    const candidates = value.split(/[、,\n]/).map(normalizeStationName).filter(Boolean);
    if (!candidates.length) return;
    setNames((current) => [...new Set([...current, ...candidates])].slice(0, MAX_STATIONS));
    setInput("");
    setFocused(true);
    inputRef.current?.focus();
  }

  return <fieldset className="station-tag-editor">
    <legend>最寄り駅・周辺駅</legend>
    <p>店舗を探すときに使われる駅名を登録してください。最大{MAX_STATIONS}駅まで設定できます。</p>
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
    <div className="station-tag-list" aria-live="polite">
      {names.map((name) => <span key={name}>{name}<input type="hidden" name="stationNames" value={name}/><button type="button" aria-label={`${name}を削除`} onClick={() => setNames((current) => current.filter((item) => item !== name))}>×</button></span>)}
      {!names.length && <small>駅名はまだ登録されていません</small>}
    </div>
  </fieldset>;
}
