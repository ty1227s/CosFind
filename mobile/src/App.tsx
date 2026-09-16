import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import * as maplibregl from "maplibre-gl";
import { getCurrentLocation, type CosFindPosition } from "./lib/location";
import { supabase } from "./lib/supabase";
import { getStoreTypeColor } from "../../lib/store-type-color";
import { getStoreTypeCode } from "../../lib/store-type-code";

type Tab = "search" | "map" | "report" | "profile";
type Brand = { id: string; name: string };
type Product = { id: string; brand_id: string; name: string; category: string; jan_code: string | null };
type Variant = { id: string; product_id: string; variant_name: string; color_code: string | null };
type Store = { id: string; name: string; chain_name: string | null; store_type: string; address: string; latitude: number; longitude: number };
type Summary = { product_id: string; store_id: string; last_reported_at: string; confirmed_variants: string[] | null; report_count: number };

function storeName(store: Store) { return store.chain_name && !store.name.startsWith(store.chain_name) ? `${store.chain_name} ${store.name}` : store.name; }
function dateLabel(value: string) { return new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" }); }
function distanceKm(a: CosFindPosition | null, store: Store) {
  if (!a) return Number.POSITIVE_INFINITY;
  const r = 6371, p1 = a.latitude * Math.PI / 180, p2 = store.latitude * Math.PI / 180;
  const dp = (store.latitude - a.latitude) * Math.PI / 180, dl = (store.longitude - a.longitude) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function App() {
  const [tab, setTab] = useState<Tab>("search");
  const [session, setSession] = useState<Session | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [location, setLocation] = useState<CosFindPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase.from("brands").select("id,name").order("name"),
      supabase.from("products").select("id,brand_id,name,category,jan_code").eq("is_active", true).order("name"),
      supabase.from("product_variants").select("id,product_id,variant_name,color_code").order("variant_name"),
      supabase.from("stores").select("id,name,chain_name,store_type,address,latitude,longitude").eq("is_active", true).order("name"),
      supabase.from("public_stock_summaries").select("product_id,store_id,last_reported_at,confirmed_variants,report_count")
    ]).then(([b, p, v, s, r]) => {
      const failed = [b.error, p.error, v.error, s.error, r.error].find(Boolean);
      if (failed) throw failed;
      if (!active) return;
      setBrands((b.data ?? []) as Brand[]); setProducts((p.data ?? []) as Product[]); setVariants((v.data ?? []) as Variant[]);
      setStores((s.data ?? []) as Store[]); setSummaries((r.data ?? []) as Summary[]); setLoading(false);
    }).catch((cause: unknown) => { if (active) { setError(cause instanceof Error ? cause.message : "データを取得できませんでした"); setLoading(false); } });
    void supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const brandById = useMemo(() => new Map(brands.map((brand) => [brand.id, brand.name])), [brands]);
  const reports = summaries.filter((summary) => summary.product_id === selectedProductId);
  const reportByStore = useMemo(() => new Map(reports.map((report) => [report.store_id, report])), [reports]);
  const mappedStores = stores.filter((store) => reportByStore.has(store.id)).sort((a, b) => distanceKm(location, a) - distanceKm(location, b));

  function chooseProduct(id: string) { setSelectedProductId(id); setTab("map"); }
  async function locate() { try { setLocation(await getCurrentLocation()); } catch { setError("現在地を取得できませんでした。端末の位置情報を許可してください。"); } }

  return <div className="mobile-app">
    <header className="mobile-topbar"><img src="/icon.png" alt=""/><span><b>CosFind</b><small>欲しいコスメが、どこにあるか分かる。</small></span>{session && <i>ログイン中</i>}</header>
    <main>
      {loading ? <State text="読み込み中…"/> : error ? <State text={error} error/> : <>
        {tab === "search" && <SearchScreen products={products} brandById={brandById} onChoose={chooseProduct}/>}
        {tab === "map" && <MapScreen product={selectedProduct} stores={mappedStores} reportByStore={reportByStore} location={location} onLocate={() => void locate()} onBack={() => setTab("search")}/>}
        {tab === "report" && <ReportScreen session={session} products={products} variants={variants} stores={stores} brandById={brandById}/>}
        {tab === "profile" && <ProfileScreen session={session}/>}
      </>}
    </main>
    <nav className="bottom-nav" aria-label="メインナビゲーション">
      <TabButton active={tab === "search"} icon="⌕" label="商品検索" onClick={() => setTab("search")}/>
      <TabButton active={tab === "map"} icon="⌖" label="地図" onClick={() => setTab("map")}/>
      <TabButton active={tab === "report"} icon="＋" label="在庫報告" onClick={() => setTab("report")}/>
      <TabButton active={tab === "profile"} icon="○" label="プロフィール" onClick={() => setTab("profile")}/>
    </nav>
  </div>;
}

function State({ text, error = false }: { text: string; error?: boolean }) { return <div className={`app-state${error ? " error" : ""}`}>{text}</div>; }
function TabButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) { return <button className={active ? "active" : ""} onClick={onClick}><b>{icon}</b><span>{label}</span></button>; }

function SearchScreen({ products, brandById, onChoose }: { products: Product[]; brandById: Map<string, string>; onChoose: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const result = query.trim() ? products.filter((p) => `${brandById.get(p.brand_id) ?? ""} ${p.name} ${p.category} ${p.jan_code ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 50) : [];
  return <section className="screen search-screen"><div className="screen-intro"><small>COSMETICS SEARCH</small><h1>欲しいコスメを探す</h1><p>商品を選ぶと、最近見つかった店舗を地図で確認できます。</p></div><label className="big-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ブランド名・商品名・カラー名" autoFocus/></label>{!query.trim() ? <div className="empty-card">検索キーワードを入力してください</div> : !result.length ? <div className="empty-card">該当する商品がありません</div> : <div className="product-list">{result.map((product) => <button key={product.id} onClick={() => onChoose(product.id)}><small>{brandById.get(product.brand_id) || "ブランド未設定"}</small><b>{product.name}</b><span>{product.category}<i>地図を見る ›</i></span></button>)}</div>}</section>;
}

function MapScreen({ product, stores, reportByStore, location, onLocate, onBack }: { product: Product | null; stores: Store[]; reportByStore: Map<string, Summary>; location: CosFindPosition | null; onLocate: () => void; onBack: () => void }) {
  const node = useRef<HTMLDivElement>(null), map = useRef<maplibregl.Map | null>(null);
  const [selected, setSelected] = useState<Store | null>(null);
  useEffect(() => {
    if (!node.current || !product) return;
    const center: [number, number] = location ? [location.longitude, location.latitude] : stores[0] ? [stores[0].longitude, stores[0].latitude] : [139.7006, 35.6896];
    const instance = new maplibregl.Map({ container: node.current, center, zoom: location ? 13 : 11, style: { version: 8, sources: { osm: { type: "raster", tiles: [import.meta.env.VITE_MAP_TILE_URL], tileSize: 256, attribution: "© OpenStreetMap contributors" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] }, attributionControl: { compact: true } });
    map.current = instance;
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const markers = stores.slice(0, 50).map((store) => { const element = document.createElement("button"); const color = getStoreTypeColor(store.store_type); element.className = "native-pin"; element.title = storeName(store); element.style.setProperty("--pin", color.background); element.style.setProperty("--pin-text", color.foreground); element.innerHTML = `<svg viewBox="0 0 44 52" aria-hidden="true"><path d="M22 1.5C11.4 1.5 3 9.9 3 20.5c0 13.7 13.3 24.6 19 30 5.7-5.4 19-16.3 19-30C41 9.9 32.6 1.5 22 1.5Z"/><text x="22" y="21">${getStoreTypeCode(store.store_type)}</text></svg>`; element.onclick = () => setSelected(store); return new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat([store.longitude, store.latitude]).addTo(instance); });
    let userMarker: maplibregl.Marker | null = null;
    if (location) { const el = document.createElement("div"); el.className = "current-dot"; userMarker = new maplibregl.Marker({ element: el }).setLngLat([location.longitude, location.latitude]).addTo(instance); }
    return () => { markers.forEach((m) => m.remove()); userMarker?.remove(); instance.remove(); map.current = null; };
  }, [location, product, stores]);
  if (!product) return <section className="screen"><div className="screen-intro"><small>STOCK MAP</small><h1>地図</h1></div><div className="empty-card">先に商品検索から商品を選択してください。<button className="primary" onClick={onBack}>商品を検索する</button></div></section>;
  return <section className="map-screen"><div className="map-product"><button onClick={onBack}>‹</button><span><small>選択中の商品</small><b>{product.name}</b></span><button onClick={onLocate} aria-label="現在地へ">⌖</button></div><div className="native-map" ref={node}/>{!stores.length && <div className="map-empty">この商品の在庫報告はまだありません</div>}{selected && <aside className="store-sheet"><button className="sheet-close" onClick={() => setSelected(null)}>×</button><small>在庫あり報告</small><h2>{storeName(selected)}</h2><p>{selected.address}</p><dl><dt>最終情報提供</dt><dd>{dateLabel(reportByStore.get(selected.id)!.last_reported_at)}</dd><dt>確認カラー</dt><dd>{reportByStore.get(selected.id)!.confirmed_variants?.join("、") || "カラー指定なし"}</dd></dl>{location && <b className="distance">現在地から約 {distanceKm(location, selected).toFixed(1)} km</b>}</aside>}</section>;
}

function ReportScreen({ session, products, variants, stores, brandById }: { session: Session | null; products: Product[]; variants: Variant[]; stores: Store[]; brandById: Map<string, string> }) {
  const [productId, setProductId] = useState(""), [variantId, setVariantId] = useState(""), [storeId, setStoreId] = useState(""), [method, setMethod] = useState("store_visit"), [comment, setComment] = useState(""), [message, setMessage] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); if (!session) return; setMessage("送信中…"); const { error } = await supabase.from("stock_reports").insert({ product_id: productId, product_variant_id: variantId || null, store_id: storeId, user_id: session.user.id, status: "available", confirmation_method: method, comment: comment.trim() || null, reported_at: new Date().toISOString() }); setMessage(error ? error.message : "情報提供ありがとうございます"); if (!error) setComment(""); }
  if (!session) return <section className="screen"><div className="screen-intro"><small>STOCK REPORT</small><h1>在庫を報告</h1></div><div className="empty-card">投稿にはログインが必要です。<span>プロフィール画面からログインしてください。</span></div></section>;
  return <section className="screen"><div className="screen-intro"><small>STOCK REPORT</small><h1>在庫を報告</h1><p>商品・カラー・店舗を選ぶだけで投稿できます。</p></div><form className="mobile-form" onSubmit={(e) => void submit(e)}><label>商品<select required value={productId} onChange={(e) => { setProductId(e.target.value); setVariantId(""); }}><option value="">商品を選択</option>{products.map((p) => <option key={p.id} value={p.id}>{brandById.get(p.brand_id)} {p.name}</option>)}</select></label><label>カラー<select value={variantId} onChange={(e) => setVariantId(e.target.value)}><option value="">カラー指定なし</option>{variants.filter((v) => v.product_id === productId).map((v) => <option key={v.id} value={v.id}>{v.color_code ? `${v.color_code} ` : ""}{v.variant_name}</option>)}</select></label><label>店舗<select required value={storeId} onChange={(e) => setStoreId(e.target.value)}><option value="">店舗を選択</option>{stores.map((s) => <option key={s.id} value={s.id}>{storeName(s)}</option>)}</select></label><label>確認方法<select value={method} onChange={(e) => setMethod(e.target.value)}><option value="store_visit">店頭で確認</option><option value="staff_confirmation">スタッフに確認</option><option value="phone">電話で確認</option><option value="official_information">公式情報</option></select></label><label>任意コメント<textarea maxLength={200} value={comment} onChange={(e) => setComment(e.target.value)}/></label><button className="primary" type="submit">在庫ありを報告</button>{message && <p className="form-message">{message}</p>}</form></section>;
}

function ProfileScreen({ session }: { session: Session | null }) {
  const [mode, setMode] = useState<"login" | "signup">("login"), [message, setMessage] = useState("");
  async function authenticate(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget), email = String(data.get("email")), password = String(data.get("password")), username = String(data.get("username") || ""); setMessage("処理中…"); const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { username } } }); setMessage(result.error ? result.error.message : mode === "login" ? "ログインしました" : "確認メールを送信しました"); }
  if (session) return <section className="screen"><div className="screen-intro"><small>MY PROFILE</small><h1>{session.user.user_metadata.username || session.user.email || "ユーザー"}さん</h1><p>Web版と同じCosFindアカウントでログインしています。</p></div><div className="profile-card"><b>{session.user.email}</b><span>ログイン中</span><button className="secondary" onClick={() => void supabase.auth.signOut()}>ログアウト</button></div></section>;
  return <section className="screen"><div className="screen-intro"><small>ACCOUNT</small><h1>{mode === "login" ? "ログイン" : "新規ユーザー登録"}</h1></div><div className="auth-switch"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>ログイン</button><button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>新規登録</button></div><form className="mobile-form" onSubmit={(e) => void authenticate(e)}>{mode === "signup" && <label>ユーザー名<input name="username" pattern="[a-z0-9_]{3,24}" required/></label>}<label>メールアドレス<input name="email" type="email" autoComplete="email" required/></label><label>パスワード<input name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required/></label><button className="primary">{mode === "login" ? "ログイン" : "登録する"}</button>{message && <p className="form-message">{message}</p>}</form></section>;
}
