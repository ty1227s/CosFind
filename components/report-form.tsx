"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "./site-header";
import { products as seedProducts, stores as seedStores } from "@/lib/mock-data";
import { readLocalCatalog } from "@/lib/local-catalog";
import { catalogRepository, usesSupabaseCatalog } from "@/lib/data";
import { formatStoreName } from "@/lib/store-name";
import { formatVariantName } from "@/lib/variant-name";
import { useSearchParams } from "next/navigation";
import { BarcodeScanner } from "./barcode-scanner";

type Phase = "editing" | "saving" | "done" | "error";

export function ReportForm() {
  const searchParams = useSearchParams();
  const requestedStoreId = searchParams.get("store") || "";
  const [products, setProducts] = useState(usesSupabaseCatalog ? [] : seedProducts);
  const [stores, setStores] = useState(usesSupabaseCatalog ? [] : seedStores);
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [productId, setProductId] = useState(usesSupabaseCatalog ? "" : (seedProducts[0]?.id || ""));
  const [variantId, setVariantId] = useState(usesSupabaseCatalog ? "" : (seedProducts[0]?.variants[0]?.id || ""));
  const [storeId, setStoreId] = useState(usesSupabaseCatalog ? "" : (seedStores[0]?.id || ""));
  const [method, setMethod] = useState("store_visit");
  const [comment, setComment] = useState("");
  const [phase, setPhase] = useState<Phase>("editing");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (usesSupabaseCatalog) return;
    const catalog = readLocalCatalog();
    setProducts(catalog.products);
    setStores(catalog.stores);
    setProductId(catalog.products[0]?.id || "");
    setVariantId(catalog.products[0]?.variants[0]?.id || "");
    setStoreId(catalog.stores.some((store) => store.id === requestedStoreId) ? requestedStoreId : (catalog.stores[0]?.id || ""));
  }, [requestedStoreId]);

  useEffect(() => {
    if (!usesSupabaseCatalog) return;
    let active = true;
    void catalogRepository.searchProducts("").then(async (remoteProducts) => {
      const firstProduct = remoteProducts[0];
      const remoteStores = firstProduct ? await catalogRepository.getStoresForProduct(firstProduct.id) : [];
      if (!active) return;
      setProducts(remoteProducts);
      setStores(remoteStores);
      setProductId(firstProduct?.id || "");
      setVariantId(firstProduct?.variants[0]?.id || "");
      setStoreId(remoteStores.some((store) => store.id === requestedStoreId) ? requestedStoreId : (remoteStores[0]?.id || ""));
    }).catch((error: unknown) => {
      if (!active) return;
      setMessage(error instanceof Error ? error.message : "商品・店舗情報を読み込めませんでした。");
      setPhase("error");
    });
    return () => { active = false; };
  }, [requestedStoreId]);

  const product = useMemo(() => products.find((item) => item.id === productId), [productId, products]);
  const brands = useMemo(() => [...new Set(products.map((item) => item.brand))].sort((a, b) => a.localeCompare(b, "ja")), [products]);
  const categories = useMemo(() => [...new Set(products.filter((item) => !brandFilter || item.brand === brandFilter).map((item) => item.category))].sort((a, b) => a.localeCompare(b, "ja")), [products, brandFilter]);
  const filteredProducts = useMemo(() => products.filter((item) => (!brandFilter || item.brand === brandFilter) && (!categoryFilter || item.category === categoryFilter)), [products, brandFilter, categoryFilter]);
  const lockedStore = useMemo(() => requestedStoreId ? stores.find((store) => store.id === requestedStoreId) : undefined, [requestedStoreId, stores]);

  function selectFirstProduct(brand: string, category: string) {
    const first = products.find((item) => (!brand || item.brand === brand) && (!category || item.category === category));
    setProductId(first?.id || ""); setVariantId(first?.variants[0]?.id || "");
  }

  function selectByJan(janCode:string){const normalized=janCode.replace(/\D/g,"");const direct=products.find(item=>item.janCode.replace(/\D/g,"")===normalized);const variantMatch=products.flatMap(item=>item.variants.map(variant=>({item,variant}))).find(({variant})=>variant.janCode.replace(/\D/g,"")===normalized);const matched=variantMatch?.item??direct;if(!matched)return{found:false,message:`JAN ${normalized} に一致する登録商品が見つかりません。`};setBrandFilter(matched.brand);setCategoryFilter(matched.category);setProductId(matched.id);setVariantId(variantMatch?.variant.id||"");return{found:true,message:variantMatch?`${matched.brand}「${matched.name}」の${formatVariantName(variantMatch.variant)}を選択しました。`:`${matched.brand}「${matched.name}」を選択しました。`};}

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPhase("saving");
    try {
      const response = await fetch("/api/community/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, variantId, storeId: lockedStore?.id || storeId, method, comment }) });
      const result = await response.json() as { error?: string; awarded?: number };
      if (!response.ok) throw new Error(result.error || "送信できませんでした");
      setMessage(`+${result.awarded ?? 1}ポイント獲得しました`); window.dispatchEvent(new Event("cosfind-profile-updated"));
      setPhase("done");
    } catch (error) { setMessage(error instanceof Error ? error.message : "送信できませんでした。"); setPhase("error"); }
  }

  return <><SiteHeader/><main className="form-page"><section><p className="eyebrow">10〜20秒で完了</p><h1>在庫ありを報告</h1><p>商品・カラー・店舗を選ぶだけです。投稿者情報は一般公開されません。</p>{phase === "done" ? <div className="success"><b>✓</b><h2>情報提供ありがとうございます</h2></div> : <form onSubmit={submit}>{lockedStore&&<div className="locked-store"><small>在庫状況を投稿する店舗</small><strong>{formatStoreName(lockedStore)}</strong><span>{lockedStore.address}</span><input type="hidden" name="storeId" value={lockedStore.id}/></div>}<BarcodeScanner onDetected={selectByJan}/><div className="form-grid">
    <label className="field"><span>1. ブランドで絞り込み</span><select value={brandFilter} onChange={(event) => { const brand=event.target.value;setBrandFilter(brand);setCategoryFilter("");selectFirstProduct(brand,""); }}><option value="">すべてのブランド</option>{brands.map((brand)=><option key={brand} value={brand}>{brand}</option>)}</select></label>
    <label className="field"><span>2. 商品ジャンルで絞り込み</span><select value={categoryFilter} onChange={(event) => { const category=event.target.value;setCategoryFilter(category);selectFirstProduct(brandFilter,category); }}><option value="">すべての商品ジャンル</option>{categories.map((category)=><option key={category} value={category}>{category}</option>)}</select></label>
    <label className="field"><span>3. 商品</span><select value={productId} required onChange={(event) => { const id = event.target.value; setProductId(id); setVariantId(products.find((item) => item.id === id)?.variants[0]?.id || ""); }}>{filteredProducts.map((item) => <option value={item.id} key={item.id}>{item.brand} / {item.name}</option>)}</select>{filteredProducts.length===0&&<small>条件に一致する商品がありません</small>}</label>
    <label className="field"><span>4. カラー / 色番</span><select value={variantId} onChange={(event) => setVariantId(event.target.value)}><option value="">カラー指定なし</option>{product?.variants.map((variant) => <option value={variant.id} key={variant.id}>{formatVariantName(variant)}</option>)}</select></label>
    {!lockedStore&&<label className="field"><span>5. 店舗</span><select value={storeId} required onChange={(event) => setStoreId(event.target.value)}>{stores.map((store) => <option value={store.id} key={store.id}>{formatStoreName(store)}</option>)}</select></label>}
    <label className="field"><span>6. 在庫状況</span><span className="choice selected-choice">✓ 在庫あり</span></label>
    <label className="field"><span>7. 確認方法</span><select value={method} onChange={(event) => setMethod(event.target.value)}><option value="store_visit">店頭で確認</option><option value="staff_confirmation">店員に確認</option><option value="phone">電話で確認</option><option value="official_information">公式情報</option></select></label>
    <label className="field"><span>8. コメント（任意）</span><textarea maxLength={200} value={comment} onChange={(event) => setComment(event.target.value)}/></label>
  </div>{phase === "error" && <p className="form-error">{message}</p>}<button className="submit" disabled={phase === "saving" || !productId || !stores.length}>{phase === "saving" ? "送信中…" : "在庫ありを報告する"}</button></form>}</section></main></>;
}
