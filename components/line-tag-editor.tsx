"use client";

import { useState } from "react";

const MAX_LINES = 20;

function normalizeLineName(value: string) {
  return value.replace(/[\s　]+/g, " ").trim().slice(0, 60);
}

export function LineTagEditor({ initialNames = [], suggestions = [] }: { initialNames?: string[]; suggestions?: string[] }) {
  const [names, setNames] = useState(() => [...new Set(initialNames.map(normalizeLineName).filter(Boolean))].slice(0, MAX_LINES));
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const candidates = [...new Set(suggestions.map(normalizeLineName).filter(Boolean))]
    .filter((name) => !names.includes(name) && (!input.trim() || name.toLocaleLowerCase("ja").includes(input.trim().toLocaleLowerCase("ja"))))
    .slice(0, 8);

  function add(value = input) {
    const candidates = value.split(/[、,\n]/).map(normalizeLineName).filter(Boolean);
    if (!candidates.length) return;
    setNames((current) => [...new Set([...current, ...candidates])].slice(0, MAX_LINES));
    setInput("");
  }

  return <fieldset className="station-tag-editor">
    <legend>路線（複数登録可）</legend>
    <p>この駅に乗り入れる路線を登録してください。最大{MAX_LINES}路線まで設定できます。</p>
    <div className="station-tag-input">
      <div className="line-tag-autocomplete">
      <input value={input} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "," || event.key === "、") { event.preventDefault(); add(); }
        if (event.key === "Escape") setFocused(false);
      }} placeholder="例：JR山手線" aria-label="追加する路線名" autoComplete="off" aria-expanded={focused && candidates.length > 0} disabled={names.length >= MAX_LINES}/>
      {focused && candidates.length > 0 && <div className="line-tag-suggestions" role="listbox" aria-label="登録済み路線の候補">{candidates.map((name) => <button type="button" role="option" key={name} onMouseDown={(event) => { event.preventDefault(); add(name); setFocused(false); }}>{name}</button>)}</div>}
      </div>
      <button type="button" onClick={() => add()} disabled={!input.trim() || names.length >= MAX_LINES}>追加</button>
    </div>
    <div className="station-tag-list" aria-live="polite">
      {names.map((name) => <span key={name}>{name}<input type="hidden" name="lineNames" value={name}/><button type="button" aria-label={`${name}を削除`} onClick={() => setNames((current) => current.filter((item) => item !== name))}>×</button></span>)}
      {!names.length && <small>路線はまだ登録されていません</small>}
    </div>
  </fieldset>;
}
