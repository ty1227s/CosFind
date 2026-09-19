"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "./site-header";
import { products as seedProducts, stores as seedStores } from "@/lib/mock-data";
import { readLocalCatalog } from "@/lib/local-catalog";
import { catalogRepository, usesSupabaseCatalog } from "@/lib/data";
import { formatStoreName } from "@/lib/store-name";
import { formatVariantName } from "@/lib/variant-name";
import { useSearchParams } from "next/navigation";
import { PRODUCT_CATEGORY_GROUPS } from "@/lib/product-categories";

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
  const [productMode, setProductMode] = useState<"registered" | "unregistered">("registered");
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
  const categories = useMemo(() => [...new Set(products.filter((item) => !brandFilter || item.brand === brandFilter).flatMap((item) => [item.category,...(item.additionalCategories??[])]))].sort((a, b) => a.localeCompare(b, "ja")), [products, brandFilter]);
  const filteredProducts = useMemo(() => products.filter((item) => (!brandFilter || item.brand === brandFilter) && (!categoryFilter || item.category === categoryFilter || (item.additionalCategories??[]).includes(categoryFilter))), [products, brandFilter, categoryFilter]);
  const lockedStore = useMemo(() => requestedStoreId ? stores.find((store) => store.id === requestedStoreId) : undefined, [requestedStoreId, stores]);

  function selectFirstProduct(brand: string, category: string) {
    const first = products.find((item) => (!brand || item.brand === brand) && (!category || item.category === category || (item.additionalCategories??[]).includes(category)));
    setProductId(first?.id || ""); setVariantId(first?.variants[0]?.id || "");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPhase("saving");
    try {
      const selectedStoreId = lockedStore?.id || storeId;
      const form = new FormData(event.currentTarget);
      const endpoint = productMode === "registered" ? "/api/community/report" : "/api/community/request";
      const body = productMode === "registered"
        ? { productId, variantId, storeId: selectedStoreId, method, comment }
        : { kind: "product", payload: { brand: String(form.get("newBrand") || ""), name: String(form.get("newName") || ""), category: String(form.get("newCategory") || ""), janCode: String(form.get("newJanCode") || ""), pa: String(form.get("newPa") || ""), variantName: String(form.get("newVariantName") || ""), colorCode: String(form.get("newColorCode") || ""), variantJanCode: String(form.get("newVariantJanCode") || ""), reportStoreId: selectedStoreId, reportMethod: method, reportComment: comment } };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string; awarded?: number };
      if (!response.ok) throw new Error(result.error || "送信できませんでした");
      setMessage(productMode === "registered" ? `+${result.awarded ?? 1}ポイント獲得しました` : `商品申請と発見情報を受け付けました。承認後に在庫報告へ反映されます。+${result.awarded ?? 3}ポイント獲得しました`); window.dispatchEvent(new Event("cosfind-profile-updated"));
      setPhase("done");
    } catch (error) { setMessage(error instanceof Error ? error.message : "送信できませんでした。"); setPhase("error"); }
  }

  return <><SiteHeader/><main className="form-page"><section><p className="eyebrow">10〜20秒で完了</p><h1>在庫ありを報告</h1><p>登録済みの商品を選ぶか、未登録の商品を申請しながら発見情報を送信できます。投稿者情報は一般公開されません。</p>{phase === "done" ? <div className="success"><b>✓</b><h2>情報提供ありがとうございます</h2><p>{message}</p></div> : <form onSubmit={submit}><fieldset className="report-product-mode"><legend>報告する商品</legend><button type="button" className={productMode==="registered"?"active":""} onClick={()=>setProductMode("registered")}>登録済み商品</button><button type="button" className={productMode==="unregistered"?"active":""} onClick={()=>setProductMode("unregistered")}>未登録商品を申請</button></fieldset>{lockedStore&&<div className="locked-store"><small>在庫状況を投稿する店舗</small><strong>{formatStoreName(lockedStore)}</strong><span>{lockedStore.address}</span><input type="hidden" name="storeId" value={lockedStore.id}/></div>}<div className="form-grid">
    {productMode==="registered"?<><label className="field"><span>ブランドで絞り込み</span><select value={brandFilter} onChange={(event) => { const brand=event.target.value;setBrandFilter(brand);setCategoryFilter("");selectFirstProduct(brand,""); }}><option value="">すべてのブランド</option>{brands.map((brand)=><option key={brand} value={brand}>{brand}</option>)}</select></label><label className="field"><span>商品ジャンルで絞り込み</span><select value={categoryFilter} onChange={(event) => { const category=event.target.value;setCategoryFilter(category);selectFirstProduct(brandFilter,category); }}><option value="">すべての商品ジャンル</option>{categories.map((category)=><option key={category} value={category}>{category}</option>)}</select></label><label className="field"><span>商品</span><select value={productId} required onChange={(event) => { const id = event.target.value; setProductId(id); setVariantId(products.find((item) => item.id === id)?.variants[0]?.id || ""); }}>{filteredProducts.map((item) => <option value={item.id} key={item.id}>{item.brand} / {item.name}</option>)}</select>{filteredProducts.length===0&&<small>条件に一致する商品がありません</small>}</label><label className="field"><span>カラー / 色番</span><select value={variantId} onChange={(event) => setVariantId(event.target.value)}>{product?.variants.map((variant) => <option value={variant.id} key={variant.id}>{formatVariantName(variant)}</option>)}</select></label></>:<><label className="field"><span>ブランド</span><input name="newBrand" required/></label><label className="field"><span>商品名</span><input name="newName" required/></label><label className="field"><span>カテゴリ</span><select name="newCategory" required defaultValue=""><option value="" disabled>カテゴリを選択</option>{PRODUCT_CATEGORY_GROUPS.map(group=><optgroup key={group.label} label={group.label}>{group.categories.map(category=><option key={category}>{category}</option>)}</optgroup>)}</select></label><label className="field"><span>商品JAN（任意）</span><input name="newJanCode" inputMode="numeric"/></label><label className="field"><span>PA（任意）</span><select name="newPa" defaultValue=""><option value="">未設定</option><option value="+">+</option><option value="++">++</option><option value="+++">+++</option><option value="++++">++++</option></select></label><label className="field"><span>カラー / バリエーション</span><input name="newVariantName" required/></label><label className="field"><span>色番（任意）</span><input name="newColorCode"/></label><label className="field"><span>カラーJAN（任意）</span><input name="newVariantJanCode" inputMode="numeric"/></label></>}
    {!lockedStore&&<label className="field"><span>店舗</span><select value={storeId} required onChange={(event) => setStoreId(event.target.value)}>{stores.map((store) => <option value={store.id} key={store.id}>{formatStoreName(store)}</option>)}</select></label>}
    <label className="field"><span>在庫状況</span><span className="choice selected-choice">✓ 在庫あり</span></label><label className="field"><span>確認方法</span><select value={method} onChange={(event) => setMethod(event.target.value)}><option value="store_visit">店頭で確認</option><option value="staff_confirmation">店員に確認</option><option value="phone">電話で確認</option><option value="official_information">公式情報</option></select></label><label className="field"><span>コメント（任意）</span><textarea maxLength={200} value={comment} onChange={(event) => setComment(event.target.value)}/></label>
  </div>{productMode==="unregistered"&&<p className="report-request-note">商品は運営の承認後に公開され、同時にこの店舗の在庫あり報告へ反映されます。</p>}{phase === "error" && <p className="form-error">{message}</p>}<button className="submit" disabled={phase === "saving" || !stores.length || (productMode==="registered"&&!productId)}>{phase === "saving" ? "送信中…" : productMode==="registered" ? "在庫ありを報告する" : "商品申請と発見情報を送信"}</button></form>}</section></main></>;
}
