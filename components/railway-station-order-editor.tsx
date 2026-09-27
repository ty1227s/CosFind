"use client";

import { useState } from "react";

type Row = { id: string; name: string };

export function RailwayStationOrderEditor({ stationNames, initialNames = [] }: { stationNames: string[]; initialNames?: string[] }) {
  const availableNames = [...new Set(stationNames)].sort((left, right) => left.localeCompare(right, "ja"));
  const initialRows = initialNames.filter((name) => availableNames.includes(name)).map((name) => ({ id: crypto.randomUUID(), name }));
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [draggingId, setDraggingId] = useState("");
  const [dropTarget, setDropTarget] = useState<{ id: string; after: boolean } | null>(null);

  const usedNames = new Set(rows.map((row) => row.name).filter(Boolean));
  const addRow = () => {
    const firstUnused = availableNames.find((name) => !usedNames.has(name));
    if (firstUnused) setRows((items) => [...items, { id: crypto.randomUUID(), name: firstUnused }]);
  };
  const update = (id: string, name: string) => setRows((items) => items.map((item) => item.id === id ? { ...item, name } : item));
  const moveRow = (id: string, targetId: string, after = false) => setRows((items) => {
    const from = items.findIndex((item) => item.id === id);
    const target = items.findIndex((item) => item.id === targetId);
    if (from < 0 || target < 0 || from === target) return items;
    const next = [...items];
    const [moving] = next.splice(from, 1);
    let destination = next.findIndex((item) => item.id === targetId);
    if (after) destination += 1;
    next.splice(destination, 0, moving);
    return next;
  });
  const moveBy = (id: string, amount: -1 | 1) => setRows((items) => {
    const from = items.findIndex((item) => item.id === id);
    const destination = from + amount;
    if (from < 0 || destination < 0 || destination >= items.length) return items;
    const next = [...items];
    [next[from], next[destination]] = [next[destination], next[from]];
    return next;
  });
  const finishDrag = () => { setDraggingId(""); setDropTarget(null); };

  return <fieldset className="variant-table-editor railway-station-editor">
    <legend>登録駅と表示順</legend>
    <p className="variant-reorder-help">登録済みの駅名タグから選択します。左端のハンドルをドラッグして、路線ページに表示する駅順を変更できます。</p>
    {rows.map((row) => <input key={`hidden-${row.id}`} type="hidden" name="stationNames" value={row.name}/>)}
    <div className="variant-table-scroll"><table><thead><tr><th className="variant-row-number" aria-label="並び順"></th><th>駅名</th><th>操作</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id} className={`${draggingId===row.id?"is-dragging":""}${dropTarget?.id===row.id?(dropTarget.after?" drop-after":" drop-before"):""}`} onDragOver={(event) => { if (!draggingId || draggingId === row.id) return; event.preventDefault(); const rect=event.currentTarget.getBoundingClientRect(); setDropTarget({id:row.id,after:event.clientY>rect.top+rect.height/2}); }} onDrop={(event) => { event.preventDefault(); if (draggingId && draggingId !== row.id) moveRow(draggingId,row.id,dropTarget?.id===row.id&&dropTarget.after); finishDrag(); }}>
      <th className="variant-row-number" scope="row"><button type="button" className="variant-drag-handle" draggable={rows.length>1} disabled={rows.length===1} aria-label={`${index+1}行目をドラッグして並び替え`} onDragStart={(event)=>{setDraggingId(row.id);event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",row.id)}} onDragEnd={finishDrag}>⠿</button><span>{index+1}</span></th>
      <td><select aria-label={`${index+1}番目の駅名`} value={row.name} onChange={(event)=>update(row.id,event.target.value)}>{availableNames.map((name)=><option key={name} value={name} disabled={name!==row.name&&usedNames.has(name)}>{name}</option>)}</select></td>
      <td><span className="variant-row-actions"><button type="button" className="variant-move" aria-label={`${index+1}行目を上へ移動`} disabled={index===0} onClick={()=>moveBy(row.id,-1)}>↑</button><button type="button" className="variant-move" aria-label={`${index+1}行目を下へ移動`} disabled={index===rows.length-1} onClick={()=>moveBy(row.id,1)}>↓</button><button type="button" className="variant-remove" aria-label={`${index+1}行目を削除`} onClick={()=>setRows((items)=>items.filter((item)=>item.id!==row.id))}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 11H8L7 9Zm3 2v7h1v-7h-1Zm3 0v7h1v-7h-1Z"/></svg></button></span></td>
    </tr>)}</tbody></table></div>
    {!availableNames.length && <p className="form-help">先に駅名タグを登録してください。</p>}
    <button type="button" className="variant-add" onClick={addRow} disabled={usedNames.size>=availableNames.length}>＋ 駅を追加</button>
  </fieldset>;
}
