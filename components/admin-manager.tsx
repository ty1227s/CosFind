"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { products as seedProducts, stores as seedStores } from "@/lib/mock-data";
import { LocationSelect } from "./location-select";
import { CoordinatePicker } from "./coordinate-picker";
import { normalizeStoreType, STORE_TYPES } from "@/lib/store-types";
import { formatStoreName } from "@/lib/store-name";
import { getStoreTypeColor } from "@/lib/store-type-color";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_GROUPS } from "@/lib/product-categories";
import { readRequests, REQUEST_KEYS, type ProductRegistrationRequest, type StoreRegistrationRequest } from "@/lib/registration-requests";
import { usesSupabaseCatalog } from "@/lib/data";
import { formatStoreBusinessHours, formatTodayStoreBusinessHours } from "@/lib/store-hours";

type Brand = { id: string; name: string; nameKana: string };
type Chain = { id: string; name: string; storeType: string };
type ProductVariant = { id: string; name: string; colorCode?: string; janCode: string; releaseDate?:string };
type Product = { id: string; brand: string; name: string; category: string; janCode: string; releaseDate?:string; spf?:number|null; pa?:"+"|"++"|"+++"|"++++"|null; createdAt?:string; variants: ProductVariant[] };
type StoreHours = Record<string,{openingTime:string;closingTime:string;closed:boolean}>;
type Store = { id: string; name: string; chain: string; type: string; address: string; latitude: number; longitude: number; customName?:boolean; createdAt?:string; provisionalBrandIds?:string[]; openingTime?:string; closingTime?:string; openingDate?:string; closingDate?:string; businessHours?:StoreHours };
type Tab = "brands" | "chains" | "products" | "stores" | "productRequests" | "storeRequests" | "users";
type DetailData = { title: string; fields: { label: string; value: string }[] };
type AdminUser = { id:string;username:string;displayName:string;email:string;avatar:string;avatarUrl:string;status:string;postingSuspended:boolean;isAdmin:boolean;createdAt:string;lastSignInAt:string|null;stockReports:number;productRequests:number;storeRequests:number;points:number;favoriteProducts:number;favoriteStores:number };

const keys = { brands: "cosfind_admin_brands_v1", chains: "cosfind_admin_chains_v1", products: "cosfind_admin_products_v1", stores: "cosfind_admin_stores_v1" };
const ADMIN_PAGE_SIZE = 30;
const seedBrands: Brand[] = [...new Set(seedProducts.map((p) => p.brand))].map((name, index) => ({ id: `b${index + 1}`, name, nameKana: "" }));
const seedChains: Chain[] = [...new Set(seedStores.map((s) => s.chain).filter(Boolean))].map((name, index) => ({ id: `c${index + 1}`, name, storeType: seedStores.find((s) => s.chain === name)?.type || STORE_TYPES[0] }));

type CatalogResponse = { ok?: boolean; brands?: Brand[]; chains?: Chain[]; products?: Product[]; stores?: Store[]; productRequests?: ProductRegistrationRequest[]; storeRequests?: StoreRegistrationRequest[] };

export function AdminManager() {
  const [tab, setTab] = useState<Tab>("brands");
  const [brands, setBrands] = useState<Brand[]>(usesSupabaseCatalog ? [] : seedBrands);
  const [chains, setChains] = useState<Chain[]>(usesSupabaseCatalog ? [] : seedChains);
  const [products, setProducts] = useState<Product[]>(usesSupabaseCatalog ? [] : seedProducts);
  const [stores, setStores] = useState<Store[]>(usesSupabaseCatalog ? [] : seedStores);
  const [productRequests, setProductRequests] = useState<ProductRegistrationRequest[]>([]);
  const [storeRequests, setStoreRequests] = useState<StoreRegistrationRequest[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersError, setUsersError] = useState("");
  const [approvingRequest, setApprovingRequest] = useState<{ kind: "product" | "store"; id: string } | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingChain, setEditingChain] = useState<Chain | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [search, setSearch] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [chainTypeFilter, setChainTypeFilter] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [productBrandFilter, setProductBrandFilter] = useState("");
  const [storeTypeFilter, setStoreTypeFilter] = useState("");
  const [storeChainFilter, setStoreChainFilter] = useState("");
  const [createdSort, setCreatedSort] = useState<"newest" | "oldest">("newest");
  const [ready, setReady] = useState(false);
  const [shortcutHelp, setShortcutHelp] = useState(false);
  const [viewing, setViewing] = useState<DetailData | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    try {
      if (!usesSupabaseCatalog) {
        const savedBrands = localStorage.getItem(keys.brands);
        const savedChains = localStorage.getItem(keys.chains);
        const savedProducts = localStorage.getItem(keys.products);
        const savedStores = localStorage.getItem(keys.stores);
        if (savedBrands) setBrands(JSON.parse(savedBrands) as Brand[]);
        if (savedChains) setChains((JSON.parse(savedChains) as Chain[]).map((chain) => ({ ...chain, storeType: normalizeStoreType(chain.storeType) })));
        if (savedProducts) setProducts(JSON.parse(savedProducts) as Product[]);
        if (savedStores) setStores((JSON.parse(savedStores) as Store[]).map((store) => ({ ...store, type: normalizeStoreType(store.type) })));
        setProductRequests(readRequests<ProductRegistrationRequest>(REQUEST_KEYS.products));
        setStoreRequests(readRequests<StoreRegistrationRequest>(REQUEST_KEYS.stores));
      }
    } finally { setReady(true); }
  }, []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    if (!usesSupabaseCatalog) return;
    void fetch("/api/admin/catalog", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as CatalogResponse : null)
      .then((remote) => {
        if (!active || !remote) return;
        setBrands(remote.brands ?? []);
        setChains(remote.chains ?? []);
        setProducts(remote.products ?? []);
        setStores(remote.stores ?? []);
        setProductRequests(remote.productRequests ?? []);
        setStoreRequests(remote.storeRequests ?? []);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [ready]);
  useEffect(() => { if (ready && !usesSupabaseCatalog) localStorage.setItem(keys.brands, JSON.stringify(brands)); }, [brands, ready]);
  useEffect(() => { if (ready && !usesSupabaseCatalog) localStorage.setItem(keys.chains, JSON.stringify(chains)); }, [chains, ready]);
  useEffect(() => { if (ready && !usesSupabaseCatalog) localStorage.setItem(keys.products, JSON.stringify(products)); }, [products, ready]);
  useEffect(() => { if (ready && !usesSupabaseCatalog) localStorage.setItem(keys.stores, JSON.stringify(stores)); }, [stores, ready]);
  useEffect(() => { if (ready && !usesSupabaseCatalog) localStorage.setItem(REQUEST_KEYS.products, JSON.stringify(productRequests)); }, [productRequests, ready]);
  useEffect(() => { if (ready && !usesSupabaseCatalog) localStorage.setItem(REQUEST_KEYS.stores, JSON.stringify(storeRequests)); }, [storeRequests, ready]);
  useEffect(() => { if(usesSupabaseCatalog)return;const reload=()=>{setProductRequests(readRequests<ProductRegistrationRequest>(REQUEST_KEYS.products));setStoreRequests(readRequests<StoreRegistrationRequest>(REQUEST_KEYS.stores))};window.addEventListener("storage",reload);window.addEventListener("cosfind-requests-updated",reload);window.addEventListener("focus",reload);return()=>{window.removeEventListener("storage",reload);window.removeEventListener("cosfind-requests-updated",reload);window.removeEventListener("focus",reload)}},[]);
  useEffect(() => { if (!ready) return; void fetch("/api/admin/users", { cache: "no-store" }).then(async (response) => { const data = await response.json() as { users?: AdminUser[]; error?: string }; if (!response.ok) throw new Error(data.error || "ユーザー一覧を取得できませんでした"); setUsers(data.users ?? []); setUsersError(""); }).catch((error) => setUsersError(error instanceof Error ? error.message : "ユーザー一覧を取得できませんでした")); }, [ready]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      const command = event.ctrlKey || event.metaKey;
      const editing = Boolean(editingBrand || editingChain || editingProduct || editingStore || viewing);
      if (event.key === "Escape") { const modal = document.querySelector(".admin-modal"); if (modal) { window.dispatchEvent(new Event("cosfind-close-modal")); return; } setShortcutHelp(false); setViewing(null); setEditingBrand(null); setEditingChain(null); setEditingProduct(null); setEditingStore(null); return; }
      if (!event.altKey || command) return;
      if (event.key.toLowerCase() === "k") { event.preventDefault(); if (shortcutHelp) window.dispatchEvent(new Event("cosfind-close-modal")); else setShortcutHelp(true); return; }
      if (event.key === "/") { event.preventDefault(); const input = document.querySelector<HTMLInputElement>(".admin-toolbar input"); input?.focus(); input?.select(); return; }
      if (event.key.toLowerCase() === "n" && !editing && !isTyping(event.target)) { event.preventDefault(); add(); return; }
      const tabs: Tab[] = ["brands", "chains", "products", "stores", "productRequests", "storeRequests", "users"];
      const index = Number(event.key) - 1;
      if (!editing && index >= 0 && index < tabs.length) { event.preventDefault(); setTab(tabs[index]); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingBrand, editingChain, editingProduct, editingStore, viewing, shortcutHelp, tab, brands, chains, productBrandFilter]);

  const q = search.toLowerCase();
  const brandRows = useMemo(() => brands.filter((b) => `${b.name} ${b.nameKana}`.toLowerCase().includes(q)), [brands, q]);
  const chainRows = useMemo(() => chains.filter((c) => `${c.name} ${c.storeType}`.toLowerCase().includes(q) && (!chainTypeFilter || c.storeType === chainTypeFilter)), [chains, q, chainTypeFilter]);
  const productRows = useMemo(() => sortByCreatedAt(products.filter((p) => `${p.brand} ${p.name} ${p.janCode}`.toLowerCase().includes(q) && (!productCategoryFilter || p.category === productCategoryFilter) && (!productBrandFilter || p.brand === productBrandFilter)), createdSort), [products, q, productCategoryFilter, productBrandFilter, createdSort]);
  const productCategories = PRODUCT_CATEGORIES;
  const storeRows = useMemo(() => sortByCreatedAt(stores.filter((s) => `${s.name} ${s.chain} ${s.address}`.toLowerCase().includes(q) && (!storeTypeFilter || s.type === storeTypeFilter) && (!storeChainFilter || s.chain === storeChainFilter) && (!prefecture || s.address.includes(prefecture)) && (!municipality || s.address.includes(municipality))), createdSort), [stores, q, storeTypeFilter, storeChainFilter, prefecture, municipality, createdSort]);
  const storeAddresses = useMemo(() => stores.map((store) => store.address), [stores]);
  const storeFilterChains = useMemo(() => storeTypeFilter ? chains.filter((chain) => chain.storeType === storeTypeFilter) : [], [chains, storeTypeFilter]);
  const userRows = useMemo(() => users.filter((user) => `${user.username} ${user.displayName} ${user.email} ${user.id}`.toLowerCase().includes(q)), [users, q]);
  const rowCount = tab === "brands" ? brandRows.length : tab === "chains" ? chainRows.length : tab === "products" ? productRows.length : tab === "stores" ? storeRows.length : tab === "productRequests" ? productRequests.length : tab === "storeRequests" ? storeRequests.length : userRows.length;
  const pageCount = Math.max(1, Math.ceil(rowCount / ADMIN_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * ADMIN_PAGE_SIZE;
  const pageSlice = <T,>(rows: T[]) => rows.slice(pageStart, pageStart + ADMIN_PAGE_SIZE);
  const visibleBrandRows = pageSlice(brandRows);
  const visibleChainRows = pageSlice(chainRows);
  const visibleProductRows = pageSlice(productRows);
  const visibleStoreRows = pageSlice(storeRows);
  const visibleProductRequests = pageSlice(productRequests);
  const visibleStoreRequests = pageSlice(storeRequests);
  const visibleUserRows = pageSlice(userRows);

  useEffect(() => { setPage(1); }, [tab, search, chainTypeFilter, productCategoryFilter, productBrandFilter, storeTypeFilter, storeChainFilter, prefecture, municipality, createdSort]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  async function persistCatalog(entity: "brand" | "chain" | "product" | "store", data: Brand | Chain | Product | Store, previous?: Brand | Chain | Product | Store, method: "POST" | "DELETE" = "POST") {
    try {
      const response = await fetch("/api/admin/catalog", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, data, previous }) });
      const result = await response.json() as { ok?: boolean; error?: string; data?: Brand | Chain | Product | Store };
      if (!response.ok || !result.ok) throw new Error(result.error || "Supabaseへの保存に失敗しました");
      if (usesSupabaseCatalog) setTimeout(() => { void reloadCatalog(); }, 0);
      return result;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Supabaseへの保存に失敗しました");
      return false;
    }
  }

  async function reloadCatalog() {
    const response = await fetch("/api/admin/catalog", { cache: "no-store" });
    if (!response.ok) return;
    const remote = await response.json() as CatalogResponse;
    setBrands(remote.brands ?? []);
    setChains(remote.chains ?? []);
    setProducts(remote.products ?? []);
    setStores(remote.stores ?? []);
    setProductRequests(remote.productRequests ?? []);
    setStoreRequests(remote.storeRequests ?? []);
  }

  async function updateRequestStatus(kind: "product" | "store", id: string, status: "approved" | "rejected") {
    if (!usesSupabaseCatalog) return true;
    const response = await fetch("/api/admin/catalog", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id, status }) });
    const result = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !result.ok) { alert(result.error || "申請状態を更新できませんでした"); return false; }
    return true;
  }

  async function saveBrand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const oldName = editingBrand?.name;
    const row = { id: editingBrand?.id || crypto.randomUUID(), name: String(form.get("name")).trim(), nameKana: String(form.get("nameKana")).trim() };
    if (brands.some((b) => b.name === row.name && b.id !== row.id)) return alert("同じブランド名が登録済みです。");
    if (!(await persistCatalog("brand", row, editingBrand?.id ? editingBrand : undefined))) return;
    setBrands((items) => editingBrand?.id ? items.map((b) => b.id === row.id ? row : b) : [row, ...items]);
    if (oldName && oldName !== row.name) setProducts((items) => items.map((p) => p.brand === oldName ? { ...p, brand: row.name } : p));
    setEditingBrand(null);
  }
  async function removeBrand(brand: Brand) {
    const used = products.filter((p) => p.brand === brand.name).length;
    if (used) return alert(`このブランドは${used}件の商品で使用中です。先に商品のブランドを変更してください。`);
    if (confirm(`ブランド「${brand.name}」を削除しますか？`) && await persistCatalog("brand", brand, undefined, "DELETE")) setBrands((items) => items.filter((b) => b.id !== brand.id));
  }
  async function saveChain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const oldName = editingChain?.name;
    const row = { id: editingChain?.id || crypto.randomUUID(), name: String(form.get("name")).trim(), storeType: String(form.get("storeType")) };
    if (chains.some((chain) => chain.name === row.name && chain.id !== row.id)) return alert("同じチェーン名が登録済みです。");
    if (!(await persistCatalog("chain", row, editingChain?.id ? editingChain : undefined))) return;
    setChains((items) => editingChain?.id ? items.map((chain) => chain.id === row.id ? row : chain) : [row, ...items]);
    if (oldName) setStores((items) => items.map((store) => store.chain === oldName ? { ...store, chain: row.name, type: row.storeType } : store));
    setEditingChain(null);
  }
  async function removeChain(chain: Chain) {
    const used = stores.filter((store) => store.chain === chain.name).length;
    if (used) return alert(`このチェーンは${used}店舗で使用中です。先に店舗のチェーンを変更してください。`);
    if (confirm(`チェーン「${chain.name}」を削除しますか？`) && await persistCatalog("chain", chain, undefined, "DELETE")) setChains((items) => items.filter((item) => item.id !== chain.id));
  }
  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const id = editingProduct?.id || crypto.randomUUID();
    const variants = String(form.get("variants") || "").split("\n").map((line) => line.trim()).filter(Boolean).map((line, i) => { const [name = "", colorCode = "", janCode = "", releaseDate = ""] = line.split("|").map((v) => v.trim()); return { id: editingProduct?.variants[i]?.id || crypto.randomUUID(), name, colorCode, janCode, releaseDate }; });
    const pa=String(form.get("pa")||"") as Product["pa"];
    const row = { id, brand: String(form.get("brand")), name: String(form.get("name")), category: String(form.get("category")), janCode: String(form.get("janCode")), releaseDate:String(form.get("releaseDate")||""),spf:form.get("spf")===""?null:Number(form.get("spf")),pa:pa||null,createdAt:editingProduct?.createdAt||new Date().toISOString(),variants };
    if (!(await persistCatalog("product", row, editingProduct || undefined))) return;
    if (!brands.some((brand) => brand.name === row.brand)) setBrands((items) => [{ id: crypto.randomUUID(), name: row.brand, nameKana: "" }, ...items]);
    setProducts((items) => editingProduct?.id ? items.map((p) => p.id === id ? row : p) : [row, ...items]);
    if (approvingRequest?.kind === "product") { if (!(await updateRequestStatus("product", approvingRequest.id, "approved"))) return; setProductRequests((items) => items.filter((request) => request.id !== approvingRequest.id)); }
    setApprovingRequest(null); setEditingProduct(null);
  }
  async function saveStore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const id = editingStore?.id || crypto.randomUUID();
    const businessHours=Object.fromEntries(["mon","tue","wed","thu","fri","sat","sun"].map(day=>[day,{openingTime:String(form.get(`openingTime_${day}`)||""),closingTime:String(form.get(`closingTime_${day}`)||""),closed:form.get(`closed_${day}`)==="on"}]));
    const openingDate=String(form.get("openingDate")||"");const closingDate=String(form.get("closingDate")||"");
    if(openingDate&&closingDate&&openingDate>closingDate)return alert("閉店日は開店日以降の日付を指定してください。");
    const row = { id, name: String(form.get("name")), chain: String(form.get("chain")), type: String(form.get("type")), address: String(form.get("address")), latitude: Number(form.get("latitude")), longitude: Number(form.get("longitude")), openingDate, closingDate, customName:form.get("customName")==="on", createdAt:editingStore?.createdAt||new Date().toISOString(), provisionalBrandIds:form.getAll("provisionalBrandIds").map(String), openingTime:"", closingTime:"", businessHours };
    const saved = await persistCatalog("store", row, editingStore || undefined);
    if (!saved) return;
    if (row.chain && !chains.some((chain) => chain.name === row.chain)) setChains((items) => [{ id: crypto.randomUUID(), name: row.chain, storeType: row.type }, ...items]);
    const confirmed = (saved.data as Store | undefined) ?? row;
    setStores((items) => editingStore?.id ? items.map((s) => s.id === id ? confirmed : s) : [confirmed, ...items.filter((s) => s.id !== confirmed.id)]);
    if (approvingRequest?.kind === "store") { if (!(await updateRequestStatus("store", approvingRequest.id, "approved"))) return; setStoreRequests((items) => items.filter((request) => request.id !== approvingRequest.id)); }
    setApprovingRequest(null); setEditingStore(null);
  }
  async function removeProduct(product: Product) {
    if (confirm(`「${product.name}」を削除しますか？`) && await persistCatalog("product", product, undefined, "DELETE")) setProducts((items) => items.filter((item) => item.id !== product.id));
  }
  async function removeStore(store: Store) {
    if (confirm(`「${formatStoreName(store)}」を削除しますか？`) && await persistCatalog("store", store, undefined, "DELETE")) {
      if (usesSupabaseCatalog) {
        const response = await fetch("/api/admin/catalog", { cache: "no-store" });
        const remote = await response.json() as CatalogResponse;
        setStores(remote.stores ?? []);
      } else setStores((items) => items.filter((item) => item.id !== store.id));
    }
  }
  function reviewProductRequest(request: ProductRegistrationRequest) { setApprovingRequest({ kind: "product", id: request.id }); setEditingProduct({ id: "", brand: request.brand, name: request.name, category: request.category, janCode: request.janCode, pa:request.pa||null, variants: [{ id: crypto.randomUUID(), name: request.variantName, colorCode: request.colorCode, janCode: request.variantJanCode }] }); }
  function reviewStoreRequest(request: StoreRegistrationRequest) { setApprovingRequest({ kind: "store", id: request.id }); setEditingStore({ id: "", name: request.name, chain: request.chain, type: request.type, address: request.address, latitude: request.latitude, longitude: request.longitude }); }
  function add() {
    if (tab === "brands") setEditingBrand({ id: "", name: "", nameKana: "" });
    if (tab === "chains") setEditingChain({ id: "", name: "", storeType: STORE_TYPES[0] });
    if (tab === "products") setEditingProduct({ id: "", brand: productBrandFilter || brands[0]?.name || "", name: "", category: "リップ", janCode: "", variants: [] });
    if (tab === "stores") setEditingStore({ id: "", name: "", chain: "", type: "", address: "", latitude: 35.6896, longitude: 139.7006 });
  }

  return <main className="admin admin-manager">
    <button type="button" className="shortcut-floating" onClick={() => setShortcutHelp(true)} title="ショートカット一覧（Alt+K）">⌨ <span>ショートカット（Alt+K）</span></button>
    <div className="admin-head"><div><p className="eyebrow">COSFIND DATABASE</p><h1>カタログ管理</h1></div><div className="migration-control"><a className="admin-announcement-link" href="/admin/announcements">お知らせ管理</a><span className="done">登録・編集・削除はSupabaseへ直接保存されます</span></div></div>
    <div className="admin-tabs"><button className={tab === "brands" ? "active" : ""} onClick={() => setTab("brands")}>ブランド（Alt+1）</button><button className={tab === "chains" ? "active" : ""} onClick={() => setTab("chains")}>チェーン（Alt+2）</button><button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>商品・カラー（Alt+3）</button><button className={tab === "stores" ? "active" : ""} onClick={() => setTab("stores")}>店舗（Alt+4）</button><button className={tab === "productRequests" ? "active" : ""} onClick={() => setTab("productRequests")}>商品申請（Alt+5） <b>{productRequests.length}</b></button><button className={tab === "storeRequests" ? "active" : ""} onClick={() => setTab("storeRequests")}>店舗申請（Alt+6） <b>{storeRequests.length}</b></button><button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>ユーザー（Alt+7）</button></div>
    <div className="admin-toolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === "users" ? "ユーザー名・HN・メール・IDで検索（Alt+/）" : "名称・かな・JAN・住所で検索（Alt+/）"}/>{tab !== "productRequests" && tab !== "storeRequests" && tab !== "users" && <button onClick={add}>＋ 新規登録（Alt+N）</button>}</div>
    {tab === "chains" && <div className="admin-filters"><label><span>店舗種別</span><select value={chainTypeFilter} onChange={(event) => setChainTypeFilter(event.target.value)}><option value="">すべての店舗種別</option>{STORE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><button type="button" onClick={() => setChainTypeFilter("")}>条件をクリア</button><small>{chainRows.length}件</small></div>}
    {tab === "products" && <div className="admin-filters"><label><span>カテゴリ</span><select value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)}><option value="">すべてのカテゴリ</option>{productCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label><span>ブランド</span><select value={productBrandFilter} onChange={(event) => setProductBrandFilter(event.target.value)}><option value="">すべてのブランド</option>{brands.map((brand) => <option key={brand.id} value={brand.name}>{brand.name}</option>)}</select></label><label><span>登録日時順</span><select value={createdSort} onChange={(event) => setCreatedSort(event.target.value as "newest" | "oldest")}><option value="newest">新しい順</option><option value="oldest">古い順</option></select></label><button type="button" onClick={() => { setProductCategoryFilter(""); setProductBrandFilter(""); }}>条件をクリア</button><small>{productRows.length}件</small></div>}
    {tab === "stores" && <><div className="admin-filters"><label><span>店舗カテゴリ（必須）</span><select value={storeTypeFilter} onChange={(event) => { setStoreTypeFilter(event.target.value); setStoreChainFilter(""); }}><option value="">店舗カテゴリを選択</option>{STORE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label><span>チェーン</span><select value={storeChainFilter} disabled={!storeTypeFilter} onChange={(event) => setStoreChainFilter(event.target.value)}><option value="">{storeTypeFilter ? "すべてのチェーン" : "先に店舗カテゴリを選択"}</option>{storeFilterChains.map((chain) => <option key={chain.id} value={chain.name}>{chain.name}</option>)}</select></label><label><span>登録日時順</span><select value={createdSort} onChange={(event) => setCreatedSort(event.target.value as "newest" | "oldest")}><option value="newest">新しい順</option><option value="oldest">古い順</option></select></label><button type="button" onClick={() => { setStoreTypeFilter(""); setStoreChainFilter(""); }}>条件をクリア</button><small>{storeRows.length}件</small></div><LocationSelect prefecture={prefecture} municipality={municipality} onPrefectureChange={setPrefecture} onMunicipalityChange={setMunicipality} storeAddresses={storeAddresses}/></>}
    {tab === "brands" && <div className="admin-table"><div className="table-head brand-cols"><span>ブランド名</span><span>ブランド名（かな）</span><span>登録商品</span><span>操作</span></div>{visibleBrandRows.map((b) => <div className="table-row brand-cols" key={b.id}><span><b>{b.name}</b></span><span>{b.nameKana || "—"}</span><span>{products.filter((p) => p.brand === b.name).length}商品</span><Actions view={() => setViewing({title:`ブランド詳細：${b.name}`,fields:[{label:"ブランド名",value:b.name},{label:"ブランド名（かな）",value:b.nameKana||"未登録"},{label:"登録商品数",value:`${products.filter((p)=>p.brand===b.name).length}商品`},{label:"登録ID",value:b.id}]})} edit={() => setEditingBrand(b)} remove={() => removeBrand(b)}/></div>)}</div>}
    {tab === "chains" && <div className="admin-table"><div className="table-head chain-cols"><span>チェーン名</span><span>店舗種別</span><span>登録店舗</span><span>操作</span></div>{visibleChainRows.map((chain) => <div className="table-row chain-cols" key={chain.id}><span><b>{chain.name}</b></span><span><StoreTypeBadge type={chain.storeType}/></span><span>{stores.filter((store) => store.chain === chain.name).length}店舗</span><Actions view={() => setViewing({title:`チェーン詳細：${chain.name}`,fields:[{label:"チェーン名",value:chain.name},{label:"店舗カテゴリ",value:chain.storeType},{label:"登録店舗数",value:`${stores.filter((store)=>store.chain===chain.name).length}店舗`},{label:"登録ID",value:chain.id}]})} edit={() => setEditingChain(chain)} remove={() => removeChain(chain)}/></div>)}</div>}
    {tab === "products" && <div className="admin-table"><div className="table-head product-cols"><span>商品 / ブランド</span><span>カテゴリ</span><span>カラー</span><span>JAN</span><span>登録日時</span><span>操作</span></div>{visibleProductRows.map((p) => <div className="table-row product-cols" key={p.id}><span><b>{p.name}</b><small>{p.brand}</small></span><span>{p.category}</span><span>{p.variants.length}種</span><span>{p.janCode || "—"}</span><span>{formatCreatedAt(p.createdAt)}</span><Actions view={() => setViewing({title:`商品詳細：${p.name}`,fields:[{label:"ブランド",value:p.brand},{label:"商品名",value:p.name},{label:"カテゴリ",value:p.category},{label:"SPF",value:p.spf==null?"未設定":String(p.spf)},{label:"PA",value:p.pa||"未設定"},{label:"商品JAN",value:p.janCode||"未登録"},{label:"カラー / 色番 / JAN",value:p.variants.length?p.variants.map((v)=>`${v.colorCode||"色番なし"} ${v.name} / ${v.janCode||"JANなし"}`).join("\n"):"未登録"},{label:"登録ID",value:p.id}]})} edit={() => setEditingProduct(p)} remove={() => void removeProduct(p)}/></div>)}</div>}
    {tab === "stores" && <div className="admin-table"><div className="table-head store-cols"><span>店舗名</span><span>種別</span><span>住所</span><span>本日の営業時間</span><span>登録日時</span><span>操作</span></div>{visibleStoreRows.map((s) => <div className="table-row store-cols" key={s.id}><span><b>{formatStoreName(s)}</b><small>{s.chain || "個店"}{s.customName?"・独自店舗名":""}</small></span><span><StoreTypeBadge type={s.type}/></span><span>{s.address}</span><span>{formatTodayStoreBusinessHours(s.businessHours)}</span><span>{formatCreatedAt(s.createdAt)}</span><Actions view={() => setViewing({title:`店舗詳細：${formatStoreName(s)}`,fields:[{label:"表示店舗名",value:formatStoreName(s)},{label:"登録店舗名",value:s.name},{label:"店舗名の方式",value:s.customName?"独自に設定":"チェーン名＋店舗名"},{label:"チェーン",value:s.chain||"チェーンなし（個店）"},{label:"店舗カテゴリ",value:s.type},{label:"住所",value:s.address},{label:"開店日・公開開始",value:formatOperatingDate(s.openingDate)},{label:"閉店日・公開終了",value:formatOperatingDate(s.closingDate)},{label:"営業時間",value:formatStoreBusinessHours(s.businessHours)},{label:"緯度 / 経度",value:`${s.latitude}, ${s.longitude}`},{label:"登録ID",value:s.id}]})} edit={() => setEditingStore(s)} remove={() => void removeStore(s)}/></div>)}</div>}
    {tab === "productRequests" && <div className="admin-table request-table"><div className="table-head request-cols"><span>申請商品</span><span>カテゴリ</span><span>カラー / 色番</span><span>申請日時</span><span>審査</span></div>{productRequests.length ? visibleProductRequests.map((request) => <div className="table-row request-cols" key={request.id}><span><b>{request.name}</b><small>{request.brand}</small></span><span>{request.category}</span><span>{request.colorCode} {request.variantName}</span><span>{new Date(request.createdAt).toLocaleString("ja-JP")}</span><RequestActions review={() => reviewProductRequest(request)} reject={() => {if(confirm("この商品申請を却下しますか？"))void updateRequestStatus("product",request.id,"rejected").then(ok=>{if(ok)setProductRequests(items=>items.filter(item=>item.id!==request.id))})}}/></div>) : <EmptyRequests/>}</div>}
    {tab === "storeRequests" && <div className="admin-table request-table"><div className="table-head request-cols"><span>申請店舗</span><span>店舗カテゴリ</span><span>住所</span><span>申請日時</span><span>審査</span></div>{storeRequests.length ? visibleStoreRequests.map((request) => <div className="table-row request-cols" key={request.id}><span><b>{request.name}</b><small>{request.chain || "個店"}</small></span><span><StoreTypeBadge type={request.type}/></span><span>{request.address}</span><span>{new Date(request.createdAt).toLocaleString("ja-JP")}</span><RequestActions review={() => reviewStoreRequest(request)} reject={() => {if(confirm("この店舗申請を却下しますか？"))void updateRequestStatus("store",request.id,"rejected").then(ok=>{if(ok)setStoreRequests(items=>items.filter(item=>item.id!==request.id))})}}/></div>) : <EmptyRequests/>}</div>}
    {tab === "users" && <>{usersError && <p className="form-error">{usersError}</p>}<div className="admin-table user-table"><div className="table-head user-cols"><span>ユーザー</span><span>状態</span><span>ポイント</span><span>活動</span><span>操作</span></div>{userRows.length ? visibleUserRows.map((user) => <div className="table-row user-cols" key={user.id}><span className="admin-user-cell"><i className={user.avatarUrl ? "image-avatar" : ""}>{user.avatarUrl ? <img src={user.avatarUrl} alt=""/> : user.avatar}</i><span><b>{user.displayName}</b><small>@{user.username || "未設定"}</small></span></span><span><b>{user.isAdmin ? "管理者" : user.postingSuspended ? "投稿停止" : user.status === "active" ? "有効" : user.status}</b></span><span>{user.points} pt</span><span><small>報告 {user.stockReports}・申請 {user.productRequests + user.storeRequests}</small></span><Actions view={() => setViewing({title:`ユーザー詳細：${user.displayName}`,fields:[{label:"HN",value:user.displayName},{label:"ユーザー名",value:`@${user.username || "未設定"}`},{label:"メールアドレス",value:user.email || "未登録"},{label:"アカウント状態",value:user.status},{label:"投稿停止",value:user.postingSuspended ? "停止中" : "投稿可能"},{label:"権限",value:user.isAdmin ? "管理者" : "一般ユーザー"},{label:"累計ポイント",value:`${user.points} pt`},{label:"在庫報告",value:`${user.stockReports}件`},{label:"商品申請",value:`${user.productRequests}件`},{label:"店舗申請",value:`${user.storeRequests}件`},{label:"お気に入り商品",value:`${user.favoriteProducts}/100件`},{label:"お気に入り店舗",value:`${user.favoriteStores}/10件`},{label:"登録日時",value:new Date(user.createdAt).toLocaleString("ja-JP")},{label:"最終ログイン",value:user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString("ja-JP") : "未ログイン"},{label:"ユーザーID",value:user.id}]})}/></div>) : <div className="empty-state"><b>該当するユーザーはいません</b></div>}</div></>}
    <AdminPagination page={currentPage} pageCount={pageCount} total={rowCount} pageSize={ADMIN_PAGE_SIZE} onChange={setPage}/>
    {editingBrand && <Modal title={editingBrand.id ? "ブランドを編集" : "ブランドを登録"} close={() => setEditingBrand(null)} submit={saveBrand}><div className="form-grid"><Field label="ブランド名"><input name="name" defaultValue={editingBrand.name} required/></Field><Field label="ブランド名（かな）"><input name="nameKana" defaultValue={editingBrand.nameKana}/></Field></div></Modal>}
    {editingChain && <Modal title={editingChain.id ? "チェーンを編集" : "チェーンを登録"} close={() => setEditingChain(null)} submit={saveChain}><div className="form-grid"><Field label="チェーン名"><input name="name" defaultValue={editingChain.name} required/></Field><Field label="店舗種別"><select name="storeType" defaultValue={editingChain.storeType} required>{STORE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field></div></Modal>}
    {editingProduct && <Modal title={approvingRequest?.kind === "product" ? "商品申請を編集して承認" : editingProduct.id ? "商品を編集" : "商品を登録"} close={() => { setApprovingRequest(null); setEditingProduct(null); }} submit={saveProduct}><div className="form-grid"><Field label="ブランド"><select name="brand" defaultValue={editingProduct.brand} required>{!brands.some((brand)=>brand.name===editingProduct.brand)&&<option value={editingProduct.brand}>{editingProduct.brand}</option>}{brands.map((b) => <option key={b.id}>{b.name}</option>)}</select></Field><Field label="商品名"><input name="name" defaultValue={editingProduct.name} required/></Field><Field label="カテゴリ"><select name="category" defaultValue={editingProduct.category} required><option value="">カテゴリを選択</option>{PRODUCT_CATEGORY_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.categories.map((category) => <option key={category} value={category}>{category}</option>)}</optgroup>)}</select></Field><Field label="商品JAN"><input name="janCode" defaultValue={editingProduct.janCode}/></Field><Field label="発売日"><input name="releaseDate" type="date" defaultValue={editingProduct.releaseDate||""}/></Field><Field label="SPF（数値のみ）"><input name="spf" type="number" min="0" step="1" defaultValue={editingProduct.spf??""}/></Field><Field label="PA"><select name="pa" defaultValue={editingProduct.pa||""}><option value="">未設定</option><option value="+">+</option><option value="++">++</option><option value="+++">+++</option><option value="++++">++++</option></select></Field></div><ProductVariantsEditor variants={editingProduct.variants}/></Modal>}
    {editingStore && <Modal title={approvingRequest?.kind === "store" ? "店舗申請を編集して承認" : editingStore.id ? "店舗を編集" : "店舗を登録"} close={() => { setApprovingRequest(null); setEditingStore(null); }} submit={saveStore}><StoreEditorFields store={editingStore} chains={chains} brands={brands}/><div className="form-grid store-operating-period"><Field label="開店日（この日から公開）"><input name="openingDate" type="date" defaultValue={editingStore.openingDate||""}/></Field><Field label="閉店日（この日から非公開）"><input name="closingDate" type="date" defaultValue={editingStore.closingDate||""}/></Field></div></Modal>}
    {viewing && <DetailModal data={viewing} close={() => setViewing(null)}/>}
    {shortcutHelp && <ShortcutHelp close={() => setShortcutHelp(false)}/>}
  </main>;
}

function sortByCreatedAt<T extends { createdAt?: string }>(rows: T[], order: "newest" | "oldest") {
  return [...rows].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : Number.NaN;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : Number.NaN;
    if (Number.isNaN(aTime)) return Number.isNaN(bTime) ? 0 : 1;
    if (Number.isNaN(bTime)) return -1;
    return order === "newest" ? bTime - aTime : aTime - bTime;
  });
}
function formatCreatedAt(value?: string) { return value ? new Date(value).toLocaleString("ja-JP") : "未登録"; }
function formatOperatingDate(value?: string, fallback="未設定") { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("ja-JP") : fallback; }

function AdminPagination({ page, pageCount, total, pageSize, onChange }: { page: number; pageCount: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return <nav className="admin-pagination" aria-label="一覧のページ切り替え">
    <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>‹ 前へ</button>
    <span>{first}〜{last}件 / 全{total}件　<b>{page} / {pageCount}ページ</b></span>
    <button type="button" disabled={page === pageCount} onClick={() => onChange(page + 1)}>次へ ›</button>
  </nav>;
}

function isTyping(target: EventTarget | null) { return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement; }
function StoreTypeBadge({ type }: { type: string }) { const color = getStoreTypeColor(type); return <span className="store-type-badge" style={{ backgroundColor: color.background, color: color.foreground }}>{type}</span>; }
function ProductVariantsEditor({ variants }: { variants: ProductVariant[] }) {
  const emptyRow = (): ProductVariant => ({ id: crypto.randomUUID(), name: "", colorCode: "", janCode: "", releaseDate: "" });
  const [rows, setRows] = useState<ProductVariant[]>(() => variants.length ? variants : [emptyRow()]);
  const update = (id: string, key: "name" | "colorCode" | "janCode" | "releaseDate", value: string) => setRows(items => items.map(item => item.id === id ? { ...item, [key]: value } : item));
  const addRow = () => setRows(items => [...items, emptyRow()]);
  const addRowOnEnter = (event: ReactKeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== "Enter" || index !== rows.length - 1) return;
    event.preventDefault();
    addRow();
    window.setTimeout(() => document.querySelector<HTMLInputElement>(`[data-variant-row="${index + 1}"]`)?.focus(), 0);
  };
  const serialized = rows.map(row => `${row.name} | ${row.colorCode || ""} | ${row.janCode} | ${row.releaseDate || ""}`).join("\n");
  const size = (value: string | undefined, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, (value?.length || 0) + 2));
  return <fieldset className="variant-table-editor">
    <legend>カラー / バリエーション</legend>
    <input type="hidden" name="variants" value={serialized}/>
    <div className="variant-table-scroll"><table><thead><tr><th className="variant-row-number" aria-label="行番号"></th><th>カラー名</th><th>色番</th><th>JAN</th><th>発売日</th><th>操作</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}>
      <th className="variant-row-number" scope="row">{index + 1}</th>
      <td><input data-variant-row={index} aria-label={`${index + 1}行目のカラー名`} value={row.name} size={size(row.name, 10, 34)} onKeyDown={event => addRowOnEnter(event, index)} onChange={event => update(row.id, "name", event.target.value)} placeholder="カラー名"/></td>
      <td><input aria-label={`${index + 1}行目の色番`} value={row.colorCode || ""} size={size(row.colorCode, 3, 10)} onKeyDown={event => addRowOnEnter(event, index)} onChange={event => update(row.id, "colorCode", event.target.value)} placeholder="色番"/></td>
      <td><input aria-label={`${index + 1}行目のJAN`} value={row.janCode} size={size(row.janCode, 13, 20)} onKeyDown={event => addRowOnEnter(event, index)} onChange={event => update(row.id, "janCode", event.target.value)} inputMode="numeric" placeholder="JANコード"/></td>
      <td><input aria-label={`${index + 1}行目の発売日`} type="date" value={row.releaseDate || ""} onKeyDown={event => addRowOnEnter(event, index)} onChange={event => update(row.id, "releaseDate", event.target.value)}/></td>
      <td><button type="button" className="variant-remove" aria-label={`${index + 1}行目を削除`} title="削除" disabled={rows.length === 1} onClick={() => setRows(items => items.filter(item => item.id !== row.id))}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 11H8L7 9Zm3 2v7h1v-7h-1Zm3 0v7h1v-7h-1Z"/></svg></button></td>
    </tr>)}</tbody></table></div>
    <button type="button" className="variant-add" onClick={addRow}>＋ カラーを追加</button>
  </fieldset>;
}
function StoreEditorFields({ store, chains, brands=[] }: { store: Store; chains: Chain[]; brands?:Brand[] }) { const [address,setAddress]=useState(store.address);const days=[{key:"mon",label:"月"},{key:"tue",label:"火"},{key:"wed",label:"水"},{key:"thu",label:"木"},{key:"fri",label:"金"},{key:"sat",label:"土"},{key:"sun",label:"日"}];const defaultHours=(day:string)=>store.businessHours?.[day]??{openingTime:store.openingTime||"",closingTime:store.closingTime||"",closed:false};const initialHours=days.map(({key})=>defaultHours(key));const initiallySame=initialHours.every(hours=>!hours.closed&&hours.openingTime===initialHours[0].openingTime&&hours.closingTime===initialHours[0].closingTime);const[sameEveryDay,setSameEveryDay]=useState(initiallySame);const[commonOpeningTime,setCommonOpeningTime]=useState(initialHours[0].openingTime);const[commonClosingTime,setCommonClosingTime]=useState(initialHours[0].closingTime);return <><div className="form-grid"><Field label="店舗名"><input name="name" defaultValue={store.name} required/></Field><label className="custom-store-name-check"><input type="checkbox" name="customName" defaultChecked={store.customName===true}/><span><b>店舗名を独自に設定する</b><small>チェックすると、チェーン名を先頭に付けず、上の店舗名をそのまま表示します。</small></span></label><StoreChainFields chains={chains} initialChain={store.chain} initialType={store.type}/><Field label="住所"><input name="address" value={address} onChange={event=>setAddress(event.target.value)} required autoComplete="street-address"/></Field></div><fieldset className="business-hours-editor"><legend>曜日別営業時間</legend><label className="same-hours-check"><input type="checkbox" checked={sameEveryDay} onChange={event=>setSameEveryDay(event.target.checked)}/><span>全日同じ営業時間</span></label>{sameEveryDay?<><div className="common-business-hours"><label><span>開店</span><input type="time" value={commonOpeningTime} onChange={event=>setCommonOpeningTime(event.target.value)}/></label><label><span>閉店</span><input type="time" value={commonClosingTime} onChange={event=>setCommonClosingTime(event.target.value)}/></label></div>{days.map(({key})=><span key={key} hidden><input type="hidden" name={`openingTime_${key}`} value={commonOpeningTime}/><input type="hidden" name={`closingTime_${key}`} value={commonClosingTime}/></span>)}</>:days.map(({key,label})=>{const hours=defaultHours(key);return <div className="business-hours-row" key={key}><b>{label}</b><label><span>開店</span><input name={`openingTime_${key}`} type="time" defaultValue={hours.openingTime}/></label><label><span>閉店</span><input name={`closingTime_${key}`} type="time" defaultValue={hours.closingTime}/></label><label className="closed-check"><input name={`closed_${key}`} type="checkbox" defaultChecked={hours.closed}/><span>定休日</span></label></div>})}</fieldset>{brands.length>0&&<Field label="取扱ブランド（仮登録・複数選択可）"><select name="provisionalBrandIds" multiple size={Math.min(10,Math.max(4,brands.length))} defaultValue={store.provisionalBrandIds??[]}>{brands.map(brand=><option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></Field>}<CoordinatePicker initialLatitude={store.latitude} initialLongitude={store.longitude} address={address}/></>}
function ShortcutHelp({ close }: { close: () => void }) { const { closing, requestClose } = useFadeClose(close); const rows = [["Alt + N", "現在のタブで新規登録"], ["Enter", "入力フォームを保存（テキストエリアでは改行）"], ["Alt + /", "管理画面内検索へ移動"], ["Alt + 1〜4", "ブランド・チェーン・商品・店舗タブへ移動"], ["Alt + 5", "商品申請タブへ移動"], ["Alt + 6", "店舗申請タブへ移動"], ["Alt + 7", "ユーザータブへ移動"], ["Esc", "編集画面またはヘルプを閉じる"], ["Alt + K", "ショートカット一覧を表示・非表示"], ["Tab / Shift + Tab", "入力項目を前後に移動"]]; return <div className={`admin-modal shortcut-modal${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-label="ショートカット一覧" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}><section><button type="button" className="modal-close shortcut-close" onClick={requestClose}>×（Esc）</button><h2>キーボードショートカット</h2><p>Chrome標準キーと競合しにくいAltキー中心の割り当てです。</p><dl>{rows.map(([key, action]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{action}</dd></div>)}</dl></section></div>; }

function DetailModal({ data, close }: { data: DetailData; close: () => void }) { const sectionRef = useRef<HTMLElement>(null); const { closing, requestClose } = useFadeClose(close); useEffect(() => { sectionRef.current?.querySelector<HTMLElement>("button")?.focus(); }, []); function trap(event: React.KeyboardEvent<HTMLElement>) { if (event.key !== "Tab") return; const buttons = [...(sectionRef.current?.querySelectorAll<HTMLElement>("button") ?? [])]; if (!buttons.length) return; const first=buttons[0];const last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()} } return <div className={`admin-modal${closing ? " is-closing" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}><section ref={sectionRef} className="admin-detail-modal" role="dialog" aria-modal="true" aria-label={data.title} onKeyDown={trap}><button type="button" className="modal-close shortcut-close" onClick={requestClose}>×（Esc）</button><h2>{data.title}</h2><dl>{data.fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl><button type="button" className="detail-close-button" onClick={requestClose}>閉じる（Esc）</button></section></div>; }
function Actions({ view, edit, remove }: { view: () => void; edit?: () => void; remove?: () => void }) { return <span className="row-actions"><button onClick={view}>詳細</button>{edit && <button onClick={edit}>編集</button>}{remove && <button className="danger" onClick={remove}>削除</button>}</span>; }
function RequestActions({ review, reject }: { review: () => void; reject: () => void }) { return <span className="row-actions request-actions"><button onClick={review}>編集して承認</button><button className="danger" onClick={reject}>却下</button></span>; }
function EmptyRequests(){return <div className="request-empty"><b>審査待ちの申請はありません</b><span>ユーザーから申請が届くと、ここに表示されます。</span></div>}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Modal({ title, close, submit, children }: { title: string; close: () => void; submit: (e: React.FormEvent<HTMLFormElement>) => void; children: React.ReactNode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { closing, requestClose } = useFadeClose(close);
  useEffect(() => { formRef.current?.querySelector<HTMLElement>("input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled])")?.focus(); }, []);
  function trapFocus(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Tab") return;
    const focusable = [...(formRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? [])].filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1]; const active = document.activeElement;
    if (event.shiftKey && (active === first || !formRef.current?.contains(active))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (active === last || !formRef.current?.contains(active))) { event.preventDefault(); first.focus(); }
  }
  return <div className={`admin-modal${closing ? " is-closing" : ""}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}><form ref={formRef} onSubmit={submit} onKeyDown={trapFocus} role="dialog" aria-modal="true" aria-label={title}><button type="button" className="modal-close shortcut-close" onClick={requestClose}>×（Esc）</button><h2>{title}</h2>{children}<button className="submit" type="submit">保存する（Enter）</button></form></div>;
}

function useFadeClose(close: () => void) { const [closing, setClosing] = useState(false); const timer = useRef<number | null>(null); const closeRef = useRef(close); closeRef.current = close; const requestClose = useCallback(() => { setClosing((current) => { if (current) return current; timer.current = window.setTimeout(() => closeRef.current(), 180); return true; }); }, []); useEffect(() => { window.addEventListener("cosfind-close-modal", requestClose); return () => { window.removeEventListener("cosfind-close-modal", requestClose); if (timer.current !== null) window.clearTimeout(timer.current); }; }, [requestClose]); return { closing, requestClose }; }
function StoreChainFields({ chains, initialChain, initialType }: { chains: Chain[]; initialChain: string; initialType: string }) {
  const initialRegistered = chains.find((chain) => chain.name === initialChain) ?? (initialChain ? { id: "request-chain", name: initialChain, storeType: initialType } : undefined);
  const [chainName, setChainName] = useState(initialRegistered?.name || "");
  const [storeType, setStoreType] = useState(initialRegistered?.storeType || initialType || "");
  const availableChains = [...chains, ...(initialRegistered && !chains.some((chain) => chain.name === initialRegistered.name) ? [initialRegistered] : [])].filter((chain) => chain.storeType === storeType);
  function changeType(type: string) { setStoreType(type); setChainName(""); }
  return <><Field label="店舗カテゴリ（必須）"><select name="type" value={storeType} required onChange={(event) => changeType(event.target.value)}><option value="">店舗カテゴリを選択</option>{STORE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></Field><Field label="チェーン"><select name="chain" value={chainName} disabled={!storeType} onChange={(event) => setChainName(event.target.value)}><option value="">{storeType ? "チェーンなし（個店）" : "先に店舗カテゴリを選択"}</option>{availableChains.map((chain) => <option key={chain.id} value={chain.name}>{chain.name}</option>)}</select>{storeType && availableChains.length === 0 && <small>このカテゴリの登録済みチェーンはありません</small>}</Field></>;
}
