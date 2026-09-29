"use client";

import { useState } from "react";

const MAX_COMPANIES = 10;

function normalizeCompany(value: string) {
  return value.replace(/[\s　]+/g, " ").trim().slice(0, 80);
}

export function RailwayCompanyEditor({ initialNames = [], suggestions = [] }: { initialNames?: string[]; suggestions?: string[] }) {
  const [names, setNames] = useState(() => [...new Set(initialNames.map(normalizeCompany).filter(Boolean))].slice(0, MAX_COMPANIES));
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const candidates = [...new Set(suggestions.map(normalizeCompany).filter(Boolean))]
    .filter((name) => !names.includes(name) && (!input.trim() || name.toLocaleLowerCase("ja").includes(input.trim().toLocaleLowerCase("ja"))))
    .slice(0, 8);

  function add(value = input) {
    const additions = value.split(/[、,\n]/).map(normalizeCompany).filter(Boolean);
    if (!additions.length) return;
    setNames((current) => [...new Set([...current, ...additions])].slice(0, MAX_COMPANIES));
    setInput("");
  }

  return <fieldset className="station-tag-editor railway-company-editor">
    <legend>鉄道会社（複数登録可）</legend>
    <p>この路線を運行する鉄道会社を登録してください。共同運行路線は複数設定できます。</p>
    <div className="station-tag-input">
      <div className="line-tag-autocomplete">
        <input value={input} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "," || event.key === "、") { event.preventDefault(); add(); }
          if (event.key === "Escape") setFocused(false);
        }} placeholder="例：JR東日本" aria-label="追加する鉄道会社" autoComplete="off" aria-expanded={focused && candidates.length > 0} disabled={names.length >= MAX_COMPANIES}/>
        {focused && candidates.length > 0 && <div className="line-tag-suggestions" role="listbox" aria-label="登録済み鉄道会社の候補">{candidates.map((name) => <button type="button" role="option" key={name} onMouseDown={(event) => { event.preventDefault(); add(name); setFocused(false); }}>{name}</button>)}</div>}
      </div>
      <button type="button" onClick={() => add()} disabled={!input.trim() || names.length >= MAX_COMPANIES}>追加</button>
    </div>
    <div className="station-tag-list" aria-live="polite">
      {names.map((name) => <span key={name}>{name}<input type="hidden" name="companies" value={name}/><button type="button" aria-label={`${name}を削除`} onClick={() => setNames((current) => current.filter((item) => item !== name))}>×</button></span>)}
      {!names.length && <small>鉄道会社はまだ登録されていません</small>}
    </div>
  </fieldset>;
}
