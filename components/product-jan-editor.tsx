"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";

type Props = { primaryJanCode: string; additionalJanCodes?: string[] };

export function ProductJanEditor({ primaryJanCode, additionalJanCodes = [] }: Props) {
  const [primary, setPrimary] = useState(primaryJanCode);
  const [rows, setRows] = useState(() => additionalJanCodes.length ? additionalJanCodes : [""]);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const normalized = useMemo(() => {
    const primaryValue = primary.trim();
    return [...new Set(rows.map((value) => value.trim()).filter((value) => value && value !== primaryValue))].slice(0, 30);
  }, [primary, rows]);

  function addRow(focus = false) {
    setRows((current) => [...current, ""]);
    if (focus) requestAnimationFrame(() => inputs.current[rows.length]?.focus());
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== "Enter" || index !== rows.length - 1) return;
    event.preventDefault();
    addRow(true);
  }

  return <fieldset className="product-jan-editor">
    <legend>商品JAN</legend>
    <label className="product-primary-jan"><span>代表JAN</span><input name="janCode" value={primary} onChange={(event) => setPrimary(event.target.value)} inputMode="numeric" autoComplete="off" maxLength={32} placeholder="例：4901234567890"/></label>
    <div className="product-additional-jan-head"><b>追加JAN</b><span>同じ商品に複数のJANがある場合に登録できます</span></div>
    <div className="product-additional-jan-list">
      {rows.map((value, index) => <div key={index}>
        <span>{index + 1}</span>
        <input ref={(element) => { inputs.current[index] = element; }} value={value} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} onKeyDown={(event) => onKeyDown(event, index)} inputMode="numeric" autoComplete="off" maxLength={32} placeholder="追加JANコード" aria-label={`追加JAN ${index + 1}`}/>
        <button type="button" onClick={() => setRows((current) => current.length === 1 ? [""] : current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`追加JAN ${index + 1}を削除`} title="削除">🗑</button>
      </div>)}
    </div>
    {normalized.map((value) => <input key={value} type="hidden" name="additionalJanCodes" value={value}/>)}
    <button className="product-additional-jan-add" type="button" onClick={() => addRow(true)}>＋ JANを追加</button>
  </fieldset>;
}
