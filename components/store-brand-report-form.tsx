"use client";

import { useMemo, useState } from "react";

type Brand = { id: string; name: string };

export function StoreBrandReportForm({ storeId, brands, reportedBrandNames }: { storeId: string; brands: Brand[]; reportedBrandNames: string[] }) {
  const available = useMemo(() => brands.filter(brand => !reportedBrandNames.includes(brand.name)), [brands, reportedBrandNames]);
  const [brandId, setBrandId] = useState("");
  const [method, setMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!brandId || !method) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/community/store-brand-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId, brandId, method }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "報告できませんでした");
      setMessage("取り扱いブランドの情報提供ありがとうございます");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) { setMessage(error instanceof Error ? error.message : "報告できませんでした"); setSaving(false); }
  }

  return <section className="store-brand-report"><h2>取り扱いブランドを報告</h2><p>商品やカラーが分からない場合でも、この店舗で取り扱いを確認したブランドだけを報告できます。</p>{available.length ? <form onSubmit={submit}><label><span>ブランド</span><select value={brandId} onChange={event=>setBrandId(event.target.value)} required><option value="" disabled>ブランドを選択</option>{available.map(brand=><option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><label><span>確認方法</span><select value={method} onChange={event=>setMethod(event.target.value)} required><option value="" disabled>確認方法を選択</option><option value="store_visit">店舗で確認</option><option value="staff_confirmation">店員に確認</option><option value="phone">電話で確認</option><option value="official_information">公式情報で確認</option></select></label><button type="submit" disabled={saving}>{saving?"送信中…":"このブランドを報告"}</button></form>:<p className="brand-index-empty">登録済みの全ブランドが報告されています。</p>}{message&&<p className="form-message" role="status">{message}</p>}</section>;
}
