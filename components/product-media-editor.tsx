"use client";

import { useState } from "react";
import {
  PRODUCT_MEDIA_TYPES,
  PRODUCT_MEDIA_TYPE_LABELS,
  type ProductMediaMention,
  type ProductMediaType,
} from "@/lib/product-media";

type EditableMention = ProductMediaMention;

function emptyMention(id = crypto.randomUUID()): EditableMention {
  return { id, mediaType: "instagram", sourceName: "", title: "", url: "", publishedOn: "", note: "" };
}

export function ProductMediaEditor({ mentions }: { mentions: ProductMediaMention[] }) {
  const [rows, setRows] = useState<EditableMention[]>(() => mentions.length ? mentions : [emptyMention("new-media-0")]);
  const update = (id: string, patch: Partial<EditableMention>) => setRows((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const serialized = JSON.stringify(rows.filter((row) => row.sourceName.trim() || row.title.trim() || row.url.trim() || row.publishedOn || row.note.trim()));

  return <fieldset className="product-media-editor">
    <legend>メディア掲載情報</legend>
    <input type="hidden" name="mediaMentions" value={serialized}/>
    <p>Instagram・YouTube・X・雑誌・Web記事などを商品ページへ掲載します。雑誌以外はURLを入力してください。</p>
    <div className="product-media-editor-list">
      {rows.map((row, index) => <div className="product-media-editor-row" key={row.id}>
        <div className="product-media-editor-number">{index + 1}</div>
        <label><span>媒体</span><select value={row.mediaType} onChange={(event) => update(row.id, { mediaType: event.target.value as ProductMediaType })}>{PRODUCT_MEDIA_TYPES.map((type) => <option key={type} value={type}>{PRODUCT_MEDIA_TYPE_LABELS[type]}</option>)}</select></label>
        <label><span>掲載元・アカウント名</span><input value={row.sourceName} maxLength={120} placeholder="例：CosFind公式" onChange={(event) => update(row.id, { sourceName: event.target.value })}/></label>
        <label><span>タイトル・投稿名（任意）</span><input value={row.title} maxLength={200} placeholder="例：新作コスメ紹介" onChange={(event) => update(row.id, { title: event.target.value })}/></label>
        <label><span>掲載日（任意）</span><input type="date" value={row.publishedOn} onChange={(event) => update(row.id, { publishedOn: event.target.value })}/></label>
        <label className="product-media-url"><span>URL（雑誌は任意）</span><input type="url" inputMode="url" value={row.url} maxLength={1000} placeholder="https://..." onChange={(event) => update(row.id, { url: event.target.value })}/></label>
        <label className="product-media-note"><span>雑誌名・号数・補足（任意）</span><input value={row.note} maxLength={300} placeholder="例：2026年11月号 42ページ" onChange={(event) => update(row.id, { note: event.target.value })}/></label>
        <button type="button" className="product-media-remove" aria-label={`${index + 1}件目を削除`} disabled={rows.length === 1} onClick={() => setRows((items) => items.filter((item) => item.id !== row.id))}>削除</button>
      </div>)}
    </div>
    <button type="button" className="variant-add" onClick={() => setRows((items) => [...items, emptyMention()])}>＋ 掲載情報を追加</button>
  </fieldset>;
}
