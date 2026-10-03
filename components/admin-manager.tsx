"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { products as seedProducts, stores as seedStores } from "@/lib/mock-data";
import { LocationSelect } from "./location-select";
import { CoordinatePicker } from "./coordinate-picker";
import { normalizeStoreType, STORE_TYPES } from "@/lib/store-types";
import { formatStoreName } from "@/lib/store-name";
import { getStoreTypeColor } from "@/lib/store-type-color";
import { PRODUCT_CATEGORIES } from "@/lib/product-categories";
import { readRequests, REQUEST_KEYS, type ProductRegistrationRequest, type StoreRegistrationRequest } from "@/lib/registration-requests";
import { usesSupabaseCatalog } from "@/lib/data";
import { formatStoreBusinessHours, formatTodayStoreBusinessHours } from "@/lib/store-hours";
import { AdminAnnouncements } from "./admin-announcements";
import { BrandCheckboxEditor } from "./brand-checkbox-editor";
import { ProductCategoryEditor } from "./product-category-editor";
import { ProductJanEditor } from "./product-jan-editor";
import { StationTagEditor } from "./station-tag-editor";
import { DiscardChangesDialog, useUnsavedCloseGuard } from "./unsaved-close-guard";
import { LineTagEditor } from "./line-tag-editor";
import { RailwayStationOrderEditor } from "./railway-station-order-editor";
import { RailwayLineVisualEditor } from "./railway-line-visual-editor";
import { RailwayCompanyEditor } from "./railway-company-editor";
import { RailwayRegionEditor } from "./railway-region-editor";
import { StationLocationEditor } from "./station-location-editor";
import { PREFECTURES } from "@/lib/prefectures";
import { RAILWAY_REGIONS } from "@/lib/railway-regions";
import { ProductCategoryBadges } from "./product-category-badge";

type Brand = { id: string; name: string; nameKana: string };
type Chain = { id: string; name: string; storeType: string };
type ProductVariant = { id: string; name: string; colorCode?: string; janCode: string; releaseDate?:string };
type Product = { id: string; brand: string; name: string; category: string; additionalCategories?:string[]; janCode: string; additionalJanCodes?:string[]; releaseDate?:string; spf?:number|null; pa?:"+"|"++"|"+++"|"++++"|null; createdAt?:string; variants: ProductVariant[] };
type StoreHours = Record<string,{openingTime:string;closingTime:string;closed:boolean}>;
type Store = { id: string; name: string; chain: string; type: string; address: string; latitude: number; longitude: number; customName?:boolean; stationNames?:string[]; createdAt?:string; provisionalBrandIds?:string[]; openingTime?:string; closingTime?:string; openingDate?:string; closingDate?:string; businessHours?:StoreHours };
type Station = { name: string; prefecture: string; municipality: string; lineNames: string[] };
type RailwayLine = { name: string; companies: string[]; stationNames: string[]; visualType: "image" | "color"; imageUrl: string; lineColor: string };
type RailwayCompany = { name: string; regions: string[] };
type Tab = "brands" | "chains" | "products" | "stores" | "productRequests" | "storeRequests" | "users" | "announcements" | "stations" | "railwayLines";
type DetailData = { title: string; fields: { label: string; value: React.ReactNode }[] };
type AdminUser = { id:string;username:string;displayName:string;email:string;avatar:string;avatarUrl:string;status:string;postingSuspended:boolean;isAdmin:boolean;createdAt:string;lastSignInAt:string|null;stockReports:number;productRequests:number;storeRequests:number;points:number;favoriteProducts:number;favoriteStores:number };

const keys = { brands: "cosfind_admin_brands_v1", chains: "cosfind_admin_chains_v1", products: "cosfind_admin_products_v1", stores: "cosfind_admin_stores_v1" };
const ADMIN_PAGE_SIZE = 20;
const seedBrands: Brand[] = [...new Set(seedProducts.map((p) => p.brand))].map((name, index) => ({ id: `b${index + 1}`, name, nameKana: "" }));
const seedChains: Chain[] = [...new Set(seedStores.map((s) => s.chain).filter(Boolean))].map((name, index) => ({ id: `c${index + 1}`, name, storeType: seedStores.find((s) => s.chain === name)?.type || STORE_TYPES[0] }));

type CatalogResponse = { ok?: boolean; brands?: Brand[]; chains?: Chain[]; products?: Product[]; stores?: Store[]; stations?: Station[]; railwayLines?: RailwayLine[]; railwayCompanies?: RailwayCompany[]; productRequests?: ProductRegistrationRequest[]; storeRequests?: StoreRegistrationRequest[] };

async function readApiJson<T>(response: Response, action: string): Promise<T> {
  const text = await response.text();
  try { return text ? JSON.parse(text) as T : {} as T; }
  catch {
    if (response.status === 401) throw new Error("管理者認証の有効期限が切れています。ログインし直してから、もう一度保存してください。");
    if (response.status === 413) throw new Error(`${action}するデータが大きすぎます。入力内容を減らして再度お試しください。`);
    throw new Error(`${action}APIから正常な応答を受け取れませんでした（HTTP ${response.status}）。少し待ってから再度お試しください。`);
  }
}

export function AdminManager() {
  const [tab, setTab] = useState<Tab>("brands");
  const [brands, setBrands] = useState<Brand[]>(usesSupabaseCatalog ? [] : seedBrands);
  const [chains, setChains] = useState<Chain[]>(usesSupabaseCatalog ? [] : seedChains);
  const [products, setProducts] = useState<Product[]>(usesSupabaseCatalog ? [] : seedProducts);
  const [stores, setStores] = useState<Store[]>(usesSupabaseCatalog ? [] : seedStores);
  const [stations, setStations] = useState<Station[]>([]);
  const [railwayLines, setRailwayLines] = useState<RailwayLine[]>([]);
  const [railwayCompanies, setRailwayCompanies] = useState<RailwayCompany[]>([]);
  const [productRequests, setProductRequests] = useState<ProductRegistrationRequest[]>([]);
  const [storeRequests, setStoreRequests] = useState<StoreRegistrationRequest[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersError, setUsersError] = useState("");
  const [approvingRequest, setApprovingRequest] = useState<{ kind: "product" | "store"; id: string } | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingChain, setEditingChain] = useState<Chain | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editingRailwayLine, setEditingRailwayLine] = useState<RailwayLine | null>(null);
  const [editingRailwayCompany, setEditingRailwayCompany] = useState<RailwayCompany | null>(null);
  const [search, setSearch] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [chainTypeFilter, setChainTypeFilter] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [productBrandFilter, setProductBrandFilter] = useState("");
  const [storeTypeFilter, setStoreTypeFilter] = useState("");
  const [storeChainFilter, setStoreChainFilter] = useState("");
  const [stationPrefectureFilter, setStationPrefectureFilter] = useState("");
  const [railwayCompanyFilter, setRailwayCompanyFilter] = useState("");
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
        setStations(remote.stations ?? []);
        setRailwayLines(remote.railwayLines ?? []);
        setRailwayCompanies(remote.railwayCompanies ?? []);
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
      const editing = Boolean(editingBrand || editingChain || editingProduct || editingStore || editingStation || editingRailwayLine || editingRailwayCompany || viewing);
      if (event.key === "Escape") { const modal = document.querySelector(".admin-modal"); if (modal) { window.dispatchEvent(new Event("cosfind-close-modal")); return; } setShortcutHelp(false); setViewing(null); setEditingBrand(null); setEditingChain(null); setEditingProduct(null); setEditingStore(null); setEditingStation(null); setEditingRailwayLine(null); setEditingRailwayCompany(null); return; }
      if (!event.altKey || command) return;
      if (event.key.toLowerCase() === "k") { event.preventDefault(); if (shortcutHelp) window.dispatchEvent(new Event("cosfind-close-modal")); else setShortcutHelp(true); return; }
      if (event.key === "/") { event.preventDefault(); const input = document.querySelector<HTMLInputElement>(".admin-toolbar input"); input?.focus(); input?.select(); return; }
      if (event.key.toLowerCase() === "n" && !editing && !isTyping(event.target)) { event.preventDefault(); add(); return; }
      const tabs: Tab[] = ["brands", "chains", "products", "stores", "productRequests", "storeRequests", "users", "announcements", "stations"];
      const index = Number(event.key) - 1;
      if (!editing && index >= 0 && index < tabs.length) { event.preventDefault(); setTab(tabs[index]); }
      if (!editing && event.key === "0") { event.preventDefault(); setTab("railwayLines"); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingBrand, editingChain, editingProduct, editingStore, editingStation, editingRailwayLine, editingRailwayCompany, viewing, shortcutHelp, tab, brands, chains, productBrandFilter]);

  const q = search.toLowerCase();
  const brandRows = useMemo(() => brands.filter((b) => `${b.name} ${b.nameKana}`.toLowerCase().includes(q)), [brands, q]);
  const chainRows = useMemo(() => chains.filter((c) => `${c.name} ${c.storeType}`.toLowerCase().includes(q) && (!chainTypeFilter || c.storeType === chainTypeFilter)), [chains, q, chainTypeFilter]);
  const productRows = useMemo(() => sortByCreatedAt(products.filter((p) => `${p.brand} ${p.name} ${p.janCode} ${(p.additionalJanCodes??[]).join(" ")}`.toLowerCase().includes(q) && (!productCategoryFilter || p.category === productCategoryFilter || (p.additionalCategories??[]).includes(productCategoryFilter)) && (!productBrandFilter || p.brand === productBrandFilter)), createdSort), [products, q, productCategoryFilter, productBrandFilter, createdSort]);
  const productCategories = PRODUCT_CATEGORIES;
  const storeRows = useMemo(() => sortByCreatedAt(stores.filter((s) => `${s.name} ${s.chain} ${s.address} ${(s.stationNames??[]).join(" ")}`.toLowerCase().includes(q) && (!storeTypeFilter || s.type === storeTypeFilter) && (!storeChainFilter || s.chain === storeChainFilter) && (!prefecture || s.address.includes(prefecture)) && (!municipality || s.address.includes(municipality))), createdSort), [stores, q, storeTypeFilter, storeChainFilter, prefecture, municipality, createdSort]);
  const storeAddresses = useMemo(() => stores.map((store) => store.address), [stores]);
  const storeFilterChains = useMemo(() => storeTypeFilter ? chains.filter((chain) => chain.storeType === storeTypeFilter) : [], [chains, storeTypeFilter]);
  const userRows = useMemo(() => users.filter((user) => `${user.username} ${user.displayName} ${user.email} ${user.id}`.toLowerCase().includes(q)), [users, q]);
  const stationRows = useMemo(() => stations.filter((station) => `${station.name} ${station.prefecture} ${station.municipality} ${station.lineNames.join(" ")}`.toLowerCase().includes(q) && (!stationPrefectureFilter || (stationPrefectureFilter === "__unassigned__" ? !station.prefecture : station.prefecture === stationPrefectureFilter))), [stations, q, stationPrefectureFilter]);
  const railwayCompanyNames = useMemo(() => [...new Set([...railwayCompanies.map((company) => company.name), ...railwayLines.flatMap((line) => line.companies)].filter(Boolean))].sort((left, right) => left.localeCompare(right, "ja")), [railwayCompanies, railwayLines]);
  const railwayLineRows = useMemo(() => railwayLines.filter((line) => `${line.name} ${line.companies.join(" ")} ${line.stationNames.join(" ")}`.toLowerCase().includes(q) && (!railwayCompanyFilter || (railwayCompanyFilter === "__unassigned__" ? !line.companies.length : line.companies.includes(railwayCompanyFilter)))), [railwayLines, q, railwayCompanyFilter]);
  const rowCount = tab === "brands" ? brandRows.length : tab === "chains" ? chainRows.length : tab === "products" ? productRows.length : tab === "stores" ? storeRows.length : tab === "stations" ? stationRows.length : tab === "railwayLines" ? railwayLineRows.length : tab === "productRequests" ? productRequests.length : tab === "storeRequests" ? storeRequests.length : tab === "users" ? userRows.length : 0;
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
  const visibleStationRows = pageSlice(stationRows);
  const visibleRailwayLineRows = pageSlice(railwayLineRows);

  useEffect(() => { setPage(1); }, [tab, search, chainTypeFilter, productCategoryFilter, productBrandFilter, storeTypeFilter, storeChainFilter, stationPrefectureFilter, railwayCompanyFilter, prefecture, municipality, createdSort]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  async function persistCatalog(entity: "brand" | "chain" | "product" | "store" | "station" | "railwayLine" | "railwayCompany", data: Brand | Chain | Product | Store | Station | RailwayLine | RailwayCompany, previous?: Brand | Chain | Product | Store | Station | RailwayLine | RailwayCompany, method: "POST" | "DELETE" = "POST") {
    try {
      const request = () => fetch("/api/admin/catalog", { method, headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ entity, data, previous }) });
      let response = await request();
      if (response.status === 401) response = await request();
      const result = await readApiJson<{ ok?: boolean; error?: string; data?: Brand | Chain | Product | Store | Station | RailwayLine | RailwayCompany }>(response, method === "DELETE" ? "削除" : "保存");
      if (!response.ok || !result.ok) throw new Error(result.error || "Supabaseへの保存に失敗しました");
      if (usesSupabaseCatalog) setTimeout(() => { void reloadCatalog(); }, 0);
      return result;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Supabaseへの保存に失敗しました");
      return false;
    }
  }

  async function reloadCatalog() {
    const response = await fetch("/api/admin/catalog", { cache: "no-store", headers: { "Accept": "application/json" } });
    if (!response.ok) return;
    const remote = await readApiJson<CatalogResponse>(response, "再読み込み").catch(() => null);
    if (!remote) return;
    setBrands(remote.brands ?? []);
    setChains(remote.chains ?? []);
    setProducts(remote.products ?? []);
    setStores(remote.stores ?? []);
    setStations(remote.stations ?? []);
    setRailwayLines(remote.railwayLines ?? []);
    setRailwayCompanies(remote.railwayCompanies ?? []);
    setProductRequests(remote.productRequests ?? []);
    setStoreRequests(remote.storeRequests ?? []);
  }

  async function updateRequestStatus(kind: "product" | "store", id: string, status: "approved" | "rejected", product?:Product) {
    if (!usesSupabaseCatalog) return true;
    const response = await fetch("/api/admin/catalog", { method: "PATCH", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ kind, id, status,productId:product?.id,productVariantId:product?.variants[0]?.id||null }) });
    const result: { ok?: boolean; error?: string } = await readApiJson<{ ok?: boolean; error?: string }>(response, "申請更新").catch((error) => ({ ok: false, error: error instanceof Error ? error.message : "申請状態を更新できませんでした" }));
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
    const parsedVariants = String(form.get("variants") || "").split("\n").map((line, index) => { const [name = "", colorCode = "", janCode = "", releaseDate = ""] = line.split("|").map((v) => v.trim()); return { id: editingProduct?.variants[index]?.id || crypto.randomUUID(), name, colorCode, janCode, releaseDate, rowNumber: index + 1 }; });
    const lastUsedRow = parsedVariants.reduce((last, variant, index) => variant.name || variant.colorCode || variant.janCode || variant.releaseDate ? index : last, -1);
    const invalidRows = parsedVariants.filter((variant, index) => !variant.name && !variant.colorCode && (Boolean(variant.janCode || variant.releaseDate) || index < lastUsedRow));
    if (invalidRows.length) { const first=invalidRows[0];alert(`カラー / バリエーションの${invalidRows.map((variant)=>variant.rowNumber).join("、")}行目は、カラー名または色番を入力してください。`);event.currentTarget.querySelector<HTMLInputElement>(`[data-variant-row="${first.rowNumber-1}"]`)?.focus();return; }
    const variants = parsedVariants.filter((variant) => variant.name || variant.colorCode).map(({id,name,colorCode,janCode,releaseDate}) => ({id,name,colorCode,janCode,releaseDate}));
    const pa=String(form.get("pa")||"") as Product["pa"];
    const janCode = String(form.get("janCode") || "").trim();
    const row = { id, brand: String(form.get("brand")), name: String(form.get("name")), category: String(form.get("category")), additionalCategories:form.getAll("additionalCategories").map(String).filter(category=>category!==String(form.get("category"))), janCode, additionalJanCodes:[...new Set(form.getAll("additionalJanCodes").map(value=>String(value).trim()).filter(value=>value&&value!==janCode))].slice(0,30), releaseDate:String(form.get("releaseDate")||""),spf:form.get("spf")===""?null:Number(form.get("spf")),pa:pa||null,createdAt:editingProduct?.createdAt||new Date().toISOString(),variants };
    const saved=await persistCatalog("product", row, editingProduct || undefined);if(!saved)return;
    const confirmed=(saved.data as Product|undefined)??row;
    if (!brands.some((brand) => brand.name === row.brand)) setBrands((items) => [{ id: crypto.randomUUID(), name: row.brand, nameKana: "" }, ...items]);
    setProducts((items) => editingProduct?.id ? items.map((p) => p.id === id ? confirmed : p) : [confirmed, ...items]);
    if (approvingRequest?.kind === "product") { if (!(await updateRequestStatus("product", approvingRequest.id, "approved",confirmed))) return; setProductRequests((items) => items.filter((request) => request.id !== approvingRequest.id)); }
    setApprovingRequest(null); setEditingProduct(null);
  }
  async function saveStore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const id = editingStore?.id || crypto.randomUUID();
    const businessHours=Object.fromEntries(["mon","tue","wed","thu","fri","sat","sun"].map(day=>[day,{openingTime:String(form.get(`openingTime_${day}`)||""),closingTime:String(form.get(`closingTime_${day}`)||""),closed:form.get(`closed_${day}`)==="on"}]));
    const openingDate=String(form.get("openingDate")||"");const closingDate=String(form.get("closingDate")||"");
    if(openingDate&&closingDate&&openingDate>closingDate)return alert("閉店日は開店日以降の日付を指定してください。");
    const row = { id, name: String(form.get("name")), chain: String(form.get("chain")), type: String(form.get("type")), address: String(form.get("address")), latitude: Number(form.get("latitude")), longitude: Number(form.get("longitude")), openingDate, closingDate, customName:form.get("customName")==="on", stationNames:form.getAll("stationNames").map(String), createdAt:editingStore?.createdAt||new Date().toISOString(), provisionalBrandIds:form.getAll("provisionalBrandIds").map(String), openingTime:"", closingTime:"", businessHours };
    const saved = await persistCatalog("store", row, editingStore || undefined);
    if (!saved) return;
    if (row.chain && !chains.some((chain) => chain.name === row.chain)) setChains((items) => [{ id: crypto.randomUUID(), name: row.chain, storeType: row.type }, ...items]);
    const confirmed = (saved.data as Store | undefined) ?? row;
    setStores((items) => editingStore?.id ? items.map((s) => s.id === id ? confirmed : s) : [confirmed, ...items.filter((s) => s.id !== confirmed.id)]);
    if (approvingRequest?.kind === "store") { if (!(await updateRequestStatus("store", approvingRequest.id, "approved"))) return; setStoreRequests((items) => items.filter((request) => request.id !== approvingRequest.id)); }
    setApprovingRequest(null); setEditingStore(null);
  }
  async function saveStation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawName = String(form.get("name") || "").replace(/[\s　]+/g, " ").trim();
    const name = rawName.endsWith("駅") ? rawName : `${rawName}駅`;
    const row: Station = { name, prefecture: String(form.get("prefecture") || ""), municipality: String(form.get("municipality") || ""), lineNames: [...new Set(form.getAll("lineNames").map(String).map((line) => line.trim()).filter(Boolean))] };
    if (!rawName) return alert("駅名を入力してください。");
    if (stations.some((station) => station.name === name && station.name !== editingStation?.name)) return alert("同じ駅名タグが登録済みです。");
    const saved = await persistCatalog("station", row, editingStation || undefined);
    if (!saved) return;
    const confirmed = (saved.data as Station | undefined) ?? row;
    const oldName = editingStation?.name;
    setStations((items) => oldName ? items.map((station) => station.name === oldName ? confirmed : station) : [confirmed, ...items]);
    if (oldName && oldName !== confirmed.name) setStores((items) => items.map((store) => ({ ...store, stationNames: (store.stationNames ?? []).map((station) => station === oldName ? confirmed.name : station) })));
    setEditingStation(null);
  }
  async function saveRailwayCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").replace(/[\s　]+/g, " ").trim();
    const regions = [...new Set(form.getAll("regions").map(String).filter((region) => RAILWAY_REGIONS.includes(region as (typeof RAILWAY_REGIONS)[number])))];
    if (!name) return alert("鉄道会社を選択してください。");
    const row: RailwayCompany = { name, regions };
    const saved = await persistCatalog("railwayCompany", row, railwayCompanies.find((company) => company.name === name));
    if (!saved) return;
    const confirmed = (saved.data as RailwayCompany | undefined) ?? row;
    setRailwayCompanies((items) => items.some((company) => company.name === name) ? items.map((company) => company.name === name ? confirmed : company) : [...items, confirmed].sort((left,right)=>left.name.localeCompare(right.name,"ja")));
    setEditingRailwayCompany(null);
  }

  async function saveRailwayLine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").replace(/[\s　]+/g, " ").trim();
    const row: RailwayLine = { name, companies: [...new Set(form.getAll("companies").map(String).map((company) => company.replace(/[\s　]+/g, " ").trim()).filter(Boolean))], stationNames: [...new Set(form.getAll("stationNames").map(String).filter(Boolean))], visualType: form.get("visualType") === "image" ? "image" : "color", imageUrl:String(form.get("imageUrl")||""), lineColor:String(form.get("lineColor")||"").toLowerCase() };
    if (!name) return alert("路線名を入力してください。");
    if (railwayLines.some((line) => line.name === name && line.name !== editingRailwayLine?.name)) return alert("同じ路線名が登録済みです。");
    const saved = await persistCatalog("railwayLine", row, editingRailwayLine || undefined);
    if (!saved) return;
    const confirmed = (saved.data as RailwayLine | undefined) ?? row;
    const oldName = editingRailwayLine?.name;
    setRailwayLines((items) => oldName ? items.map((line) => line.name === oldName ? confirmed : line) : [confirmed, ...items]);
    setStations((items) => items.map((station) => {
      const lineNames = station.lineNames.filter((line) => line !== oldName && line !== confirmed.name);
      if (confirmed.stationNames.includes(station.name)) lineNames.push(confirmed.name);
      return { ...station, lineNames: [...new Set(lineNames)] };
    }));
    setEditingRailwayLine(null);
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
  function reviewProductRequest(request: ProductRegistrationRequest) { setApprovingRequest({ kind: "product", id: request.id }); setEditingProduct({ id: "", brand: request.brand, name: request.name, category: request.category, additionalCategories:[], janCode: request.janCode, additionalJanCodes:[], pa:request.pa||null, variants: request.variantName || request.colorCode || request.variantJanCode ? [{ id: crypto.randomUUID(), name: request.variantName, colorCode: request.colorCode, janCode: request.variantJanCode }] : [] }); }
  function reviewStoreRequest(request: StoreRegistrationRequest) { setApprovingRequest({ kind: "store", id: request.id }); setEditingStore({ id: "", name: request.name, chain: request.chain, type: request.type, address: request.address, latitude: request.latitude, longitude: request.longitude }); }
  function add() {
    if (tab === "announcements") { window.dispatchEvent(new Event("cosfind-new-announcement")); return; }
    if (tab === "brands") setEditingBrand({ id: "", name: "", nameKana: "" });
    if (tab === "chains") setEditingChain({ id: "", name: "", storeType: STORE_TYPES[0] });
    if (tab === "products") setEditingProduct({ id: "", brand: productBrandFilter || brands[0]?.name || "", name: "", category: "リップ", additionalCategories:[], janCode: "", additionalJanCodes:[], variants: [] });
    if (tab === "stores") setEditingStore({ id: "", name: "", chain: "", type: "", address: "", latitude: 35.6896, longitude: 139.7006 });
    if (tab === "stations") setEditingStation({ name: "", prefecture: "", municipality: "", lineNames: [] });
    if (tab === "railwayLines") setEditingRailwayLine({ name: "", companies: railwayCompanyFilter && railwayCompanyFilter !== "__unassigned__" ? [railwayCompanyFilter] : [], stationNames: [], visualType:"color", imageUrl:"", lineColor:"" });
  }

  return <main className="admin admin-manager">
    <button type="button" className="shortcut-floating" onClick={() => setShortcutHelp(true)} title="ショートカット一覧（Alt+K）">⌨ <span>ショートカット（Alt+K）</span></button>
    <div className="admin-head"><div><p className="eyebrow">COSFIND DATABASE</p><h1>カタログ管理</h1></div><div className="migration-control"><span className="done">登録・編集・削除はSupabaseへ直接保存されます</span></div></div>
    <div className="admin-tabs"><button className={tab === "brands" ? "active" : ""} onClick={() => setTab("brands")}>ブランド（Alt+1）</button><button className={tab === "chains" ? "active" : ""} onClick={() => setTab("chains")}>チェーン（Alt+2）</button><button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>商品・カラー（Alt+3）</button><button className={tab === "stores" ? "active" : ""} onClick={() => setTab("stores")}>店舗（Alt+4）</button><button className={tab === "productRequests" ? "active" : ""} onClick={() => setTab("productRequests")}>商品申請（Alt+5） <b>{productRequests.length}</b></button><button className={tab === "storeRequests" ? "active" : ""} onClick={() => setTab("storeRequests")}>店舗申請（Alt+6） <b>{storeRequests.length}</b></button><button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>ユーザー（Alt+7）</button><button className={tab === "announcements" ? "active" : ""} onClick={() => setTab("announcements")}>お知らせ（Alt+8）</button><button className={tab === "stations" ? "active" : ""} onClick={() => setTab("stations")}>駅名タグ（Alt+9）</button><button className={tab === "railwayLines" ? "active" : ""} onClick={() => setTab("railwayLines")}>路線（Alt+0）</button></div>
    {tab !== "announcements" && <div className="admin-toolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === "users" ? "ユーザー名・HN・メール・IDで検索（Alt+/）" : "名称・かな・JAN・住所で検索（Alt+/）"}/>{tab !== "productRequests" && tab !== "storeRequests" && tab !== "users" && <button onClick={add}>＋ 新規登録（Alt+N）</button>}</div>}
    {tab === "chains" && <div className="admin-filters"><label><span>店舗種別</span><select value={chainTypeFilter} onChange={(event) => setChainTypeFilter(event.target.value)}><option value="">すべての店舗種別</option>{STORE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><button type="button" onClick={() => setChainTypeFilter("")}>条件をクリア</button><small>{chainRows.length}件</small></div>}
    {tab === "products" && <div className="admin-filters"><label><span>カテゴリ</span><select value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)}><option value="">すべてのカテゴリ</option>{productCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label><span>ブランド</span><select value={productBrandFilter} onChange={(event) => setProductBrandFilter(event.target.value)}><option value="">すべてのブランド</option>{brands.map((brand) => <option key={brand.id} value={brand.name}>{brand.name}</option>)}</select></label><label><span>登録日時順</span><select value={createdSort} onChange={(event) => setCreatedSort(event.target.value as "newest" | "oldest")}><option value="newest">新しい順</option><option value="oldest">古い順</option></select></label><button type="button" onClick={() => { setProductCategoryFilter(""); setProductBrandFilter(""); }}>条件をクリア</button><small>{productRows.length}件</small></div>}
    {tab === "stores" && <><div className="admin-filters"><label><span>店舗カテゴリ（必須）</span><select value={storeTypeFilter} onChange={(event) => { setStoreTypeFilter(event.target.value); setStoreChainFilter(""); }}><option value="">店舗カテゴリを選択</option>{STORE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label><span>チェーン</span><select value={storeChainFilter} disabled={!storeTypeFilter} onChange={(event) => setStoreChainFilter(event.target.value)}><option value="">{storeTypeFilter ? "すべてのチェーン" : "先に店舗カテゴリを選択"}</option>{storeFilterChains.map((chain) => <option key={chain.id} value={chain.name}>{chain.name}</option>)}</select></label><label><span>登録日時順</span><select value={createdSort} onChange={(event) => setCreatedSort(event.target.value as "newest" | "oldest")}><option value="newest">新しい順</option><option value="oldest">古い順</option></select></label><button type="button" onClick={() => { setStoreTypeFilter(""); setStoreChainFilter(""); }}>条件をクリア</button><small>{storeRows.length}件</small></div><LocationSelect prefecture={prefecture} municipality={municipality} onPrefectureChange={setPrefecture} onMunicipalityChange={setMunicipality} storeAddresses={storeAddresses}/></>}
    {tab === "stations" && <div className="admin-filters"><label><span>都道府県</span><select value={stationPrefectureFilter} onChange={(event) => setStationPrefectureFilter(event.target.value)}><option value="">すべての都道府県</option><option value="__unassigned__">未登録</option>{PREFECTURES.map((prefecture)=><option key={prefecture} value={prefecture}>{prefecture}</option>)}</select></label><button type="button" onClick={() => setStationPrefectureFilter("")}>条件をクリア</button><small>{stationRows.length}件</small></div>}
    {tab === "railwayLines" && <><div className="admin-filters"><label><span>鉄道会社</span><select value={railwayCompanyFilter} onChange={(event) => setRailwayCompanyFilter(event.target.value)}><option value="">すべての鉄道会社</option><option value="__unassigned__">未登録</option>{railwayCompanyNames.map((company)=><option key={company} value={company}>{company}</option>)}</select></label><button type="button" onClick={() => setRailwayCompanyFilter("")}>条件をクリア</button><button type="button" onClick={() => setEditingRailwayCompany({name:railwayCompanyNames[0]??"",regions:railwayCompanies.find((company)=>company.name===railwayCompanyNames[0])?.regions??[]})} disabled={!railwayCompanyNames.length}>鉄道会社の地域分類</button><small>{railwayLineRows.length}件</small></div><div className="railway-company-region-summary" aria-label="鉄道会社の地域分類">{railwayCompanies.map((company)=><button type="button" key={company.name} onClick={()=>setEditingRailwayCompany(company)}><b>{company.name}</b><span>{company.regions.join(" / ")||"地域未登録"}</span></button>)}</div></>}
    {tab === "brands" && <div className="admin-table"><div className="table-head brand-cols"><span>ブランド名</span><span>ブランド名（かな）</span><span>登録商品</span><span>操作</span></div>{visibleBrandRows.map((b) => <div className="table-row brand-cols" key={b.id}><span><b>{b.name}</b></span><span>{b.nameKana || "—"}</span><span>{products.filter((p) => p.brand === b.name).length}商品</span><Actions view={() => setViewing({title:`ブランド詳細：${b.name}`,fields:[{label:"ブランド名",value:b.name},{label:"ブランド名（かな）",value:b.nameKana||"未登録"},{label:"登録商品数",value:`${products.filter((p)=>p.brand===b.name).length}商品`},{label:"登録ID",value:b.id}]})} edit={() => setEditingBrand(b)} remove={() => removeBrand(b)}/></div>)}</div>}
    {tab === "chains" && <div className="admin-table"><div className="table-head chain-cols"><span>チェーン名</span><span>店舗種別</span><span>登録店舗</span><span>操作</span></div>{visibleChainRows.map((chain) => <div className="table-row chain-cols" key={chain.id}><span><b>{chain.name}</b></span><span><StoreTypeBadge type={chain.storeType}/></span><span>{stores.filter((store) => store.chain === chain.name).length}店舗</span><Actions view={() => setViewing({title:`チェーン詳細：${chain.name}`,fields:[{label:"チェーン名",value:chain.name},{label:"店舗カテゴリ",value:chain.storeType},{label:"登録店舗数",value:`${stores.filter((store)=>store.chain===chain.name).length}店舗`},{label:"登録ID",value:chain.id}]})} edit={() => setEditingChain(chain)} remove={() => removeChain(chain)}/></div>)}</div>}
{tab === "products" && <div className="admin-table"><div className="table-head product-cols"><span>商品 / ブランド</span><span>カテゴリ</span><span>カラー</span><span>JAN</span><span>登録日時</span><span>操作</span></div>{visibleProductRows.map((p) => <div className="table-row product-cols" key={p.id}><span><b>{p.name}</b><small>{p.brand}</small></span><ProductCategoryBadges categories={[p.category,...(p.additionalCategories??[])]}/><span>{Math.max(1,p.variants.length)}種</span><span>{[p.janCode,...(p.additionalJanCodes??[])].filter(Boolean).join(" / ") || "—"}</span><span>{formatCreatedAt(p.createdAt)}</span><Actions view={() => setViewing({title:`商品詳細：${p.name}`,fields:[{label:"ブランド",value:p.brand},{label:"商品名",value:p.name},{label:"主カテゴリ",value:<ProductCategoryBadges categories={[p.category]}/>},{label:"追加カテゴリ",value:p.additionalCategories?.length?<ProductCategoryBadges categories={p.additionalCategories}/>:"未登録"},{label:"SPF",value:p.spf==null?"未設定":String(p.spf)},{label:"PA",value:p.pa||"未設定"},{label:"代表JAN",value:p.janCode||"未登録"},{label:"追加JAN",value:p.additionalJanCodes?.join("\n")||"未登録"},{label:"カラー / 色番 / JAN",value:p.variants.length?p.variants.map((v)=>`${v.colorCode||"色番なし"} ${v.name} / ${v.janCode||"JANなし"}`).join("\n"):"未登録"},{label:"登録ID",value:p.id}]})} edit={() => setEditingProduct(p)} remove={() => void removeProduct(p)}/></div>)}</div>}
    {tab === "stores" && <div className="admin-table"><div className="table-head store-cols"><span>店舗名</span><span>種別</span><span>住所</span><span>本日の営業時間</span><span>登録日時</span><span>操作</span></div>{visibleStoreRows.map((s) => <div className="table-row store-cols" key={s.id}><span><b>{formatStoreName(s)}</b><small>{s.chain || "個店"}{s.customName?"・独自店舗名":""}{s.stationNames?.length?`・${s.stationNames.join(" / ")}`:""}</small></span><span><StoreTypeBadge type={s.type}/></span><span>{s.address}</span><span>{formatTodayStoreBusinessHours(s.businessHours)}</span><span>{formatCreatedAt(s.createdAt)}</span><Actions view={() => setViewing({title:`店舗詳細：${formatStoreName(s)}`,fields:[{label:"表示店舗名",value:formatStoreName(s)},{label:"登録店舗名",value:s.name},{label:"店舗名の方式",value:s.customName?"独自に設定":"チェーン名＋店舗名"},{label:"チェーン",value:s.chain||"チェーンなし（個店）"},{label:"店舗カテゴリ",value:s.type},{label:"最寄り駅・周辺駅",value:s.stationNames?.join("、")||"未登録"},{label:"取扱いブランド",value:(s.provisionalBrandIds??[]).map(id=>brands.find(brand=>brand.id===id)?.name).filter((name):name is string=>Boolean(name)).join("、")||"未登録"},{label:"住所",value:s.address},{label:"開店日・公開開始",value:formatOperatingDate(s.openingDate)},{label:"閉店日・公開終了",value:formatOperatingDate(s.closingDate)},{label:"営業時間",value:formatStoreBusinessHours(s.businessHours)},{label:"緯度 / 経度",value:`${s.latitude}, ${s.longitude}`},{label:"登録ID",value:s.id}]})} edit={() => setEditingStore(s)} remove={() => void removeStore(s)}/></div>)}</div>}
    {tab === "stations" && <div className="admin-table"><div className="table-head station-cols"><span>駅名タグ</span><span>路線</span><span>登録店舗</span><span>操作</span></div>{visibleStationRows.map((station) => <div className="table-row station-cols" key={station.name}><span><b>{station.name}</b><small>{station.prefecture ? `${station.prefecture}${station.municipality ? ` ${station.municipality}` : ""}` : "所在地未設定"}</small></span><span className="admin-line-tags">{station.lineNames.length ? station.lineNames.map((line) => <small key={line}>{line}</small>) : "未登録"}</span><span>{stores.filter((store) => store.stationNames?.includes(station.name)).length}店舗</span><Actions view={() => setViewing({title:`駅名タグ詳細：${station.name}`,fields:[{label:"駅名",value:station.name},{label:"都道府県",value:station.prefecture||"未設定"},{label:"市区町村",value:station.municipality||"未設定"},{label:"路線",value:station.lineNames.join("、")||"未登録"},{label:"登録店舗数",value:`${stores.filter((store)=>store.stationNames?.includes(station.name)).length}店舗`}]})} edit={() => setEditingStation(station)}/></div>)}</div>}
    {tab === "railwayLines" && <div className="admin-table"><div className="table-head railway-line-cols"><span>路線名</span><span>鉄道会社</span><span>登録駅（表示順）</span><span>駅数</span><span>操作</span></div>{visibleRailwayLineRows.map((line) => <div className="table-row railway-line-cols" key={line.name}><span className="admin-railway-line-name">{line.visualType==="image"&&line.imageUrl?<img src={line.imageUrl} alt=""/>:line.lineColor?<i className="railway-line-color-mark" style={{backgroundColor:line.lineColor}}/>:null}<b>{line.name}</b></span><span>{line.companies.join(" / ") || "未登録"}</span><span className="admin-line-tags">{line.stationNames.length ? line.stationNames.map((station,index) => <small key={station}>{index+1}. {station}</small>) : "未登録"}</span><span>{line.stationNames.length}駅</span><Actions view={() => setViewing({title:`路線詳細：${line.name}`,fields:[{label:"路線名",value:line.name},{label:"鉄道会社",value:line.companies.join("、")||"未登録"},{label:"表示方法",value:line.visualType==="image"?"路線記号画像":"ラインカラー"},{label:line.visualType==="image"?"路線記号":"ラインカラー",value:line.visualType==="image"&&line.imageUrl?<img className="admin-railway-line-detail-image" src={line.imageUrl} alt={`${line.name}の路線記号`}/>:line.lineColor?<span className="admin-line-color-detail"><i style={{backgroundColor:line.lineColor}}/>{line.lineColor}</span>:"未登録"},{label:"登録駅（表示順）",value:line.stationNames.map((station,index)=>`${index+1}. ${station}`).join("\n")||"未登録"},{label:"登録駅数",value:`${line.stationNames.length}駅`}]})} edit={() => setEditingRailwayLine(line)}/></div>)}</div>}
    {tab === "productRequests" && <div className="admin-table request-table"><div className="table-head request-cols"><span>申請商品</span><span>カテゴリ</span><span>カラー / 色番</span><span>申請日時</span><span>審査</span></div>{productRequests.length ? visibleProductRequests.map((request) => <div className="table-row request-cols" key={request.id}><span><b>{request.name}</b><small>{request.brand}{request.reportStoreId?` ・ 在庫報告付き：${request.reportStoreName||"店舗情報なし"}`:""}</small></span><ProductCategoryBadges categories={[request.category]}/><span>{[request.colorCode,request.variantName].filter(Boolean).join(" ")||"なし"}</span><span>{new Date(request.createdAt).toLocaleString("ja-JP")}</span><RequestActions review={() => reviewProductRequest(request)} reject={() => {if(confirm("この商品申請を却下しますか？"))void updateRequestStatus("product",request.id,"rejected").then(ok=>{if(ok)setProductRequests(items=>items.filter(item=>item.id!==request.id))})}}/></div>) : <EmptyRequests/>}</div>}
    {tab === "storeRequests" && <div className="admin-table request-table"><div className="table-head request-cols"><span>申請店舗</span><span>店舗カテゴリ</span><span>住所</span><span>申請日時</span><span>審査</span></div>{storeRequests.length ? visibleStoreRequests.map((request) => <div className="table-row request-cols" key={request.id}><span><b>{request.name}</b><small>{request.chain || "個店"}</small></span><span><StoreTypeBadge type={request.type}/></span><span>{request.address}</span><span>{new Date(request.createdAt).toLocaleString("ja-JP")}</span><RequestActions review={() => reviewStoreRequest(request)} reject={() => {if(confirm("この店舗申請を却下しますか？"))void updateRequestStatus("store",request.id,"rejected").then(ok=>{if(ok)setStoreRequests(items=>items.filter(item=>item.id!==request.id))})}}/></div>) : <EmptyRequests/>}</div>}
    {tab === "users" && <>{usersError && <p className="form-error">{usersError}</p>}<div className="admin-table user-table"><div className="table-head user-cols"><span>ユーザー</span><span>状態</span><span>ポイント</span><span>活動</span><span>操作</span></div>{userRows.length ? visibleUserRows.map((user) => <div className="table-row user-cols" key={user.id}><span className="admin-user-cell"><i className={user.avatarUrl ? "image-avatar" : ""}>{user.avatarUrl ? <img src={user.avatarUrl} alt=""/> : user.avatar}</i><span><b>{user.displayName}</b><small>@{user.username || "未設定"}</small></span></span><span><b>{user.isAdmin ? "管理者" : user.postingSuspended ? "投稿停止" : user.status === "active" ? "有効" : user.status}</b></span><span>{user.points} pt</span><span><small>報告 {user.stockReports}・申請 {user.productRequests + user.storeRequests}</small></span><Actions view={() => setViewing({title:`ユーザー詳細：${user.displayName}`,fields:[{label:"HN",value:user.displayName},{label:"ユーザー名",value:`@${user.username || "未設定"}`},{label:"メールアドレス",value:user.email || "未登録"},{label:"アカウント状態",value:user.status},{label:"投稿停止",value:user.postingSuspended ? "停止中" : "投稿可能"},{label:"権限",value:user.isAdmin ? "管理者" : "一般ユーザー"},{label:"累計ポイント",value:`${user.points} pt`},{label:"在庫報告",value:`${user.stockReports}件`},{label:"商品申請",value:`${user.productRequests}件`},{label:"店舗申請",value:`${user.storeRequests}件`},{label:"お気に入り商品",value:`${user.favoriteProducts}/100件`},{label:"お気に入り店舗",value:`${user.favoriteStores}/10件`},{label:"登録日時",value:new Date(user.createdAt).toLocaleString("ja-JP")},{label:"最終ログイン",value:user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString("ja-JP") : "未ログイン"},{label:"ユーザーID",value:user.id}]})}/></div>) : <div className="empty-state"><b>該当するユーザーはいません</b></div>}</div></>}
    {tab === "announcements" && <AdminAnnouncements/>}
    {tab !== "announcements" && <AdminPagination page={currentPage} pageCount={pageCount} total={rowCount} pageSize={ADMIN_PAGE_SIZE} onChange={setPage}/>}
    {editingBrand && <Modal title={editingBrand.id ? "ブランドを編集" : "ブランドを登録"} close={() => setEditingBrand(null)} submit={saveBrand}><div className="form-grid"><Field label="ブランド名"><input name="name" defaultValue={editingBrand.name} required/></Field><Field label="ブランド名（かな）"><input name="nameKana" defaultValue={editingBrand.nameKana}/></Field></div></Modal>}
    {editingChain && <Modal title={editingChain.id ? "チェーンを編集" : "チェーンを登録"} close={() => setEditingChain(null)} submit={saveChain}><div className="form-grid"><Field label="チェーン名"><input name="name" defaultValue={editingChain.name} required/></Field><Field label="店舗種別"><select name="storeType" defaultValue={editingChain.storeType} required>{STORE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field></div></Modal>}
    {editingProduct && <Modal title={approvingRequest?.kind === "product" ? "商品申請を編集して承認" : editingProduct.id ? "商品を編集" : "商品を登録"} close={() => { setApprovingRequest(null); setEditingProduct(null); }} submit={saveProduct}><div className="form-grid"><Field label="ブランド"><select name="brand" defaultValue={editingProduct.brand} required>{!brands.some((brand)=>brand.name===editingProduct.brand)&&<option value={editingProduct.brand}>{editingProduct.brand}</option>}{brands.map((b) => <option key={b.id}>{b.name}</option>)}</select></Field><Field label="商品名"><input name="name" defaultValue={editingProduct.name} required/></Field><ProductCategoryEditor primaryCategory={editingProduct.category} additionalCategories={editingProduct.additionalCategories??[]}/><ProductJanEditor primaryJanCode={editingProduct.janCode} additionalJanCodes={editingProduct.additionalJanCodes??[]}/><Field label="発売日"><input name="releaseDate" type="date" defaultValue={editingProduct.releaseDate||""}/></Field><Field label="SPF（数値のみ）"><input name="spf" type="number" min="0" step="1" defaultValue={editingProduct.spf??""}/></Field><Field label="PA"><select name="pa" defaultValue={editingProduct.pa||""}><option value="">未設定</option><option value="+">+</option><option value="++">++</option><option value="+++">+++</option><option value="++++">++++</option></select></Field></div><ProductVariantsEditor variants={editingProduct.variants}/></Modal>}
    {editingStore && <Modal title={approvingRequest?.kind === "store" ? "店舗申請を編集して承認" : editingStore.id ? "店舗を編集" : "店舗を登録"} close={() => { setApprovingRequest(null); setEditingStore(null); }} submit={saveStore}><StoreEditorFields store={editingStore} chains={chains} brands={brands} stations={stations}/><div className="form-grid store-operating-period"><Field label="開店日（この日から公開）"><input name="openingDate" type="date" defaultValue={editingStore.openingDate||""}/></Field><Field label="閉店日（この日から非公開）"><input name="closingDate" type="date" defaultValue={editingStore.closingDate||""}/></Field></div></Modal>}
    {editingStation && <Modal title={editingStation.name ? "駅名タグを編集" : "駅名タグを登録"} close={() => setEditingStation(null)} submit={saveStation}><div className="form-grid"><Field label="駅名"><input name="name" defaultValue={editingStation.name} placeholder="例：新宿駅" required/></Field></div><StationLocationEditor initialPrefecture={editingStation.prefecture} initialMunicipality={editingStation.municipality}/><LineTagEditor initialNames={editingStation.lineNames} suggestions={railwayLines.map((line)=>line.name)}/></Modal>}
    {editingRailwayLine && <Modal title={editingRailwayLine.name ? "路線を編集" : "路線を登録"} close={() => setEditingRailwayLine(null)} submit={saveRailwayLine}><div className="form-grid"><Field label="路線名"><input name="name" defaultValue={editingRailwayLine.name} placeholder="例：JR山手線" required/></Field></div><RailwayCompanyEditor initialNames={editingRailwayLine.companies} suggestions={railwayCompanyNames}/><RailwayLineVisualEditor initialType={editingRailwayLine.visualType} initialImageUrl={editingRailwayLine.imageUrl} initialLineColor={editingRailwayLine.lineColor}/><RailwayStationOrderEditor stationNames={stations.map((station)=>station.name)} initialNames={editingRailwayLine.stationNames}/></Modal>}
    {editingRailwayCompany && <Modal title="鉄道会社の地域分類を編集" close={() => setEditingRailwayCompany(null)} submit={saveRailwayCompany}><div className="form-grid"><Field label="鉄道会社"><select name="name" value={editingRailwayCompany.name} onChange={(event)=>{const company=railwayCompanies.find((item)=>item.name===event.target.value);setEditingRailwayCompany({name:event.target.value,regions:company?.regions??[]})}} required>{railwayCompanyNames.map((company)=><option key={company} value={company}>{company}</option>)}</select></Field></div><RailwayRegionEditor key={editingRailwayCompany.name} initialRegions={editingRailwayCompany.regions}/></Modal>}
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
  const [draggingId, setDraggingId] = useState("");
  const [dropTarget, setDropTarget] = useState<{ id: string; after: boolean } | null>(null);
  const update = (id: string, key: "name" | "colorCode" | "janCode" | "releaseDate", value: string) => setRows(items => items.map(item => item.id === id ? { ...item, [key]: value } : item));
  const addRow = () => setRows(items => [...items, emptyRow()]);
  const moveRow = (id: string, targetId: string, after = false) => setRows(items => {
    const from = items.findIndex(item => item.id === id);
    const target = items.findIndex(item => item.id === targetId);
    if (from < 0 || target < 0 || from === target) return items;
    const next = [...items];
    const [moving] = next.splice(from, 1);
    let destination = next.findIndex(item => item.id === targetId);
    if (after) destination += 1;
    next.splice(destination, 0, moving);
    return next;
  });
  const moveBy = (id: string, amount: -1 | 1) => setRows(items => {
    const from = items.findIndex(item => item.id === id);
    const destination = from + amount;
    if (from < 0 || destination < 0 || destination >= items.length) return items;
    const next = [...items];
    [next[from], next[destination]] = [next[destination], next[from]];
    return next;
  });
  const finishDrag = () => { setDraggingId(""); setDropTarget(null); };
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
    <p className="variant-reorder-help">各行はカラー名または色番のどちらかを入力してください。左端のハンドルをドラッグして並び替えできます。</p>
    <div className="variant-table-scroll"><table><thead><tr><th className="variant-row-number" aria-label="並び順"></th><th>カラー名</th><th>色番</th><th>JAN</th><th>発売日</th><th>操作</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id} className={`${draggingId===row.id?"is-dragging":""}${dropTarget?.id===row.id?(dropTarget.after?" drop-after":" drop-before"):""}`} onDragOver={event=>{if(!draggingId||draggingId===row.id)return;event.preventDefault();event.dataTransfer.dropEffect="move";const rect=event.currentTarget.getBoundingClientRect();setDropTarget({id:row.id,after:event.clientY>rect.top+rect.height/2})}} onDrop={event=>{event.preventDefault();if(draggingId&&draggingId!==row.id)moveRow(draggingId,row.id,dropTarget?.id===row.id&&dropTarget.after);finishDrag()}}>
      <th className="variant-row-number" scope="row"><button type="button" className="variant-drag-handle" draggable={rows.length>1} disabled={rows.length===1} aria-label={`${index + 1}行目をドラッグして並び替え`} title="ドラッグして並び替え" onDragStart={event=>{setDraggingId(row.id);event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",row.id)}} onDragEnd={finishDrag}>⠿</button><span>{index + 1}</span></th>
      <td><input data-variant-row={index} aria-label={`${index + 1}行目のカラー名`} value={row.name} size={size(row.name, 10, 34)} onKeyDown={event => addRowOnEnter(event, index)} onChange={event => update(row.id, "name", event.target.value)} placeholder="カラー名"/></td>
      <td><input aria-label={`${index + 1}行目の色番`} value={row.colorCode || ""} size={size(row.colorCode, 3, 10)} onKeyDown={event => addRowOnEnter(event, index)} onChange={event => update(row.id, "colorCode", event.target.value)} placeholder="色番"/></td>
      <td><input aria-label={`${index + 1}行目のJAN`} value={row.janCode} size={size(row.janCode, 13, 20)} onKeyDown={event => addRowOnEnter(event, index)} onChange={event => update(row.id, "janCode", event.target.value)} inputMode="numeric" placeholder="JANコード"/></td>
      <td><input aria-label={`${index + 1}行目の発売日`} type="date" value={row.releaseDate || ""} onKeyDown={event => addRowOnEnter(event, index)} onChange={event => update(row.id, "releaseDate", event.target.value)}/></td>
      <td><span className="variant-row-actions"><button type="button" className="variant-move" aria-label={`${index + 1}行目を上へ移動`} title="上へ移動" disabled={index===0} onClick={()=>moveBy(row.id,-1)}>↑</button><button type="button" className="variant-move" aria-label={`${index + 1}行目を下へ移動`} title="下へ移動" disabled={index===rows.length-1} onClick={()=>moveBy(row.id,1)}>↓</button><button type="button" className="variant-remove" aria-label={`${index + 1}行目を削除`} title="削除" disabled={rows.length === 1} onClick={() => setRows(items => items.filter(item => item.id !== row.id))}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 11H8L7 9Zm3 2v7h1v-7h-1Zm3 0v7h1v-7h-1Z"/></svg></button></span></td>
    </tr>)}</tbody></table></div>
    <button type="button" className="variant-add" onClick={addRow}>＋ カラーを追加</button>
  </fieldset>;
}
function StoreEditorFields({ store, chains, brands=[], stations=[] }: { store: Store; chains: Chain[]; brands?:Brand[]; stations?:Station[] }) { const [address,setAddress]=useState(store.address);return <><div className="form-grid"><Field label="店舗名"><input name="name" defaultValue={store.name} required/></Field><label className="custom-store-name-check"><input type="checkbox" name="customName" defaultChecked={store.customName===true}/><span><b>店舗名を独自に設定する</b><small>チェックすると、チェーン名を先頭に付けず、上の店舗名をそのまま表示します。</small></span></label><StoreChainFields chains={chains} initialChain={store.chain} initialType={store.type}/><Field label="住所"><input name="address" value={address} onChange={event=>setAddress(event.target.value)} required autoComplete="street-address"/></Field></div><StationTagEditor initialNames={store.stationNames??[]} suggestions={stations.map((station)=>station.name)}/><StoreBusinessHoursEditor store={store}/>{brands.length>0&&<BrandCheckboxEditor brands={brands} initialIds={store.provisionalBrandIds??[]}/>}<CoordinatePicker initialLatitude={store.latitude} initialLongitude={store.longitude} address={address}/></>}

type HoursMode = "same" | "daily" | "weekdayWeekend" | "monSatSun" | "weekdaySatSun";
type HoursValue = { openingTime: string; closingTime: string; closed: boolean };
const STORE_HOUR_DAYS = [{key:"mon",label:"月"},{key:"tue",label:"火"},{key:"wed",label:"水"},{key:"thu",label:"木"},{key:"fri",label:"金"},{key:"sat",label:"土"},{key:"sun",label:"日"}] as const;
const STORE_HOUR_GROUPS: Record<HoursMode,{label:string;days:string[]}[]> = {
  same:[{label:"月〜日",days:["mon","tue","wed","thu","fri","sat","sun"]}],
  daily:STORE_HOUR_DAYS.map(({key,label})=>({label,days:[key]})),
  weekdayWeekend:[{label:"月〜金",days:["mon","tue","wed","thu","fri"]},{label:"土・日",days:["sat","sun"]}],
  monSatSun:[{label:"月〜土",days:["mon","tue","wed","thu","fri","sat"]},{label:"日",days:["sun"]}],
  weekdaySatSun:[{label:"月〜金",days:["mon","tue","wed","thu","fri"]},{label:"土",days:["sat"]},{label:"日",days:["sun"]}],
};
function sameHours(left:HoursValue,right:HoursValue){return left.openingTime===right.openingTime&&left.closingTime===right.closingTime&&left.closed===right.closed}
function groupMatches(hours:StoreHours,days:string[]){const first=hours[days[0]];return days.every(day=>sameHours(hours[day],first))}
function inferHoursMode(hours:StoreHours):HoursMode{if(groupMatches(hours,STORE_HOUR_GROUPS.same[0].days))return"same";if(STORE_HOUR_GROUPS.weekdayWeekend.every(group=>groupMatches(hours,group.days)))return"weekdayWeekend";if(STORE_HOUR_GROUPS.monSatSun.every(group=>groupMatches(hours,group.days)))return"monSatSun";if(STORE_HOUR_GROUPS.weekdaySatSun.every(group=>groupMatches(hours,group.days)))return"weekdaySatSun";return"daily"}
function StoreBusinessHoursEditor({store}:{store:Store}){
  const initialHours=Object.fromEntries(STORE_HOUR_DAYS.map(({key})=>[key,{...(store.businessHours?.[key]??{openingTime:store.openingTime||"",closingTime:store.closingTime||"",closed:false})}])) as StoreHours;
  const[mode,setMode]=useState<HoursMode>(()=>inferHoursMode(initialHours));
  const[hours,setHours]=useState<StoreHours>(initialHours);
  const groups=STORE_HOUR_GROUPS[mode];
  function changeMode(nextMode:HoursMode){setMode(nextMode);setHours(current=>{const next={...current};for(const group of STORE_HOUR_GROUPS[nextMode]){const representative={...current[group.days[0]]};for(const day of group.days)next[day]={...representative}}return next})}
  function updateGroup(days:string[],field:keyof HoursValue,value:string|boolean){setHours(current=>{const next={...current};for(const day of days)next[day]={...current[day],[field]:value};return next})}
  return <fieldset className="business-hours-editor"><legend>曜日別営業時間</legend><label className="hours-pattern-select"><span>設定パターン</span><select value={mode} onChange={event=>changeMode(event.target.value as HoursMode)}><option value="same">月〜日すべて同じ（1種類）</option><option value="daily">月〜日すべて異なる（7種類）</option><option value="weekdayWeekend">月〜金／土日（2種類）</option><option value="monSatSun">月〜土／日（2種類）</option><option value="weekdaySatSun">月〜金／土／日（3種類）</option></select></label><div className="business-hours-groups">{groups.map(group=>{const value=hours[group.days[0]];return <div className="business-hours-row" key={group.label}><b>{group.label}</b><label><span>開店</span><input type="time" value={value.openingTime} disabled={value.closed} onChange={event=>updateGroup(group.days,"openingTime",event.target.value)}/></label><label><span>閉店</span><input type="time" value={value.closingTime} disabled={value.closed} onChange={event=>updateGroup(group.days,"closingTime",event.target.value)}/></label><label className="closed-check"><input type="checkbox" checked={value.closed} onChange={event=>updateGroup(group.days,"closed",event.target.checked)}/><span>定休日</span></label></div>})}</div>{STORE_HOUR_DAYS.map(({key})=><span key={key} hidden><input type="hidden" name={`openingTime_${key}`} value={hours[key].openingTime}/><input type="hidden" name={`closingTime_${key}`} value={hours[key].closingTime}/>{hours[key].closed&&<input type="hidden" name={`closed_${key}`} value="on"/>}</span>)}</fieldset>
}
function ShortcutHelp({ close }: { close: () => void }) { const { closing, requestClose } = useFadeClose(close); const rows = [["Alt + N", "現在のタブで新規登録"], ["Enter", "入力フォームを保存／破棄確認では保存せず閉じる"], ["Alt + /", "管理画面内検索へ移動"], ["Alt + 1〜4", "ブランド・チェーン・商品・店舗タブへ移動"], ["Alt + 5", "商品申請タブへ移動"], ["Alt + 6", "店舗申請タブへ移動"], ["Alt + 7", "ユーザータブへ移動"], ["Alt + 8", "お知らせタブへ移動"], ["Alt + 9", "駅名タグタブへ移動"], ["Alt + 0", "路線タブへ移動"], ["Esc", "編集画面を閉じる／破棄確認では編集へ戻る"], ["Alt + K", "ショートカット一覧を表示・非表示"], ["Tab / Shift + Tab", "入力項目を前後に移動"]]; return <div className={`admin-modal shortcut-modal${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-label="ショートカット一覧" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}><section><button type="button" className="modal-close shortcut-close" onClick={requestClose}>×（Esc）</button><h2>キーボードショートカット</h2><p>Chrome標準キーと競合しにくいAltキー中心の割り当てです。</p><dl>{rows.map(([key, action]) => <div key={key}><dt><kbd>{key}</kbd></dt><dd>{action}</dd></div>)}</dl></section></div>; }

function DetailModal({ data, close }: { data: DetailData; close: () => void }) { const sectionRef = useRef<HTMLElement>(null); const { closing, requestClose } = useFadeClose(close); useEffect(() => { sectionRef.current?.querySelector<HTMLElement>("button")?.focus(); }, []); function trap(event: React.KeyboardEvent<HTMLElement>) { if (event.key !== "Tab") return; const buttons = [...(sectionRef.current?.querySelectorAll<HTMLElement>("button") ?? [])]; if (!buttons.length) return; const first=buttons[0];const last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()} } return <div className={`admin-modal${closing ? " is-closing" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}><section ref={sectionRef} className="admin-detail-modal" role="dialog" aria-modal="true" aria-label={data.title} onKeyDown={trap}><button type="button" className="modal-close shortcut-close" onClick={requestClose}>×（Esc）</button><h2>{data.title}</h2><dl>{data.fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl><button type="button" className="detail-close-button" onClick={requestClose}>閉じる（Esc）</button></section></div>; }
function Actions({ view, edit, remove }: { view: () => void; edit?: () => void; remove?: () => void }) { return <span className="row-actions"><button onClick={view}>詳細</button>{edit && <button onClick={edit}>編集</button>}{remove && <button className="danger" onClick={remove}>削除</button>}</span>; }
function RequestActions({ review, reject }: { review: () => void; reject: () => void }) { return <span className="row-actions request-actions"><button onClick={review}>編集して承認</button><button className="danger" onClick={reject}>却下</button></span>; }
function EmptyRequests(){return <div className="request-empty"><b>審査待ちの申請はありません</b><span>ユーザーから申請が届くと、ここに表示されます。</span></div>}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
function changeHoveredSelectWithWheel(event: WheelEvent) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement) || target.disabled || event.deltaY === 0) return;
  event.stopPropagation();
  if (target.multiple || target.size > 1) return;
  event.preventDefault();

  const direction = event.deltaY > 0 ? 1 : -1;
  const options = Array.from(target.options);
  let nextIndex = target.selectedIndex;
  for (let index = target.selectedIndex + direction; index >= 0 && index < options.length; index += direction) {
    const option = options[index];
    const group = option.parentElement instanceof HTMLOptGroupElement ? option.parentElement : null;
    if (!option.disabled && !group?.disabled) { nextIndex = index; break; }
  }
  target.focus({ preventScroll: true });
  if (nextIndex === target.selectedIndex) return;
  target.selectedIndex = nextIndex;
  target.dispatchEvent(new Event("change", { bubbles: true }));
}
function Modal({ title, close, submit, children }: { title: string; close: () => void; submit: (e: React.FormEvent<HTMLFormElement>) => void; children: React.ReactNode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { closing, requestClose: requestFadeClose } = useFadeClose(close, false);
  const { confirming, markDirty, requestClose, cancelClose, discardAndClose } = useUnsavedCloseGuard({ active: true, close: requestFadeClose });
  useEffect(() => { formRef.current?.querySelector<HTMLElement>("input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled])")?.focus(); }, []);
  useEffect(() => { const form = formRef.current; if (!form) return; const handleWheel = (event: WheelEvent) => changeHoveredSelectWithWheel(event); form.addEventListener("wheel", handleWheel, { passive: false }); return () => form.removeEventListener("wheel", handleWheel); }, []);
  function trapFocus(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Tab") return;
    const focusable = [...(formRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? [])].filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1]; const active = document.activeElement;
    if (event.shiftKey && (active === first || !formRef.current?.contains(active))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (active === last || !formRef.current?.contains(active))) { event.preventDefault(); first.focus(); }
  }
  return <div className={`admin-modal${closing ? " is-closing" : ""}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}><form ref={formRef} onSubmit={submit} onKeyDown={trapFocus} onInputCapture={markDirty} onChangeCapture={markDirty} onDragStartCapture={markDirty} onClickCapture={(event) => { const target = event.target instanceof Element ? event.target : null; const button = target?.closest("button"); if ((button && button.type !== "submit" && !button.classList.contains("modal-close")) || target?.closest(".coordinate-map")) markDirty(); }} role="dialog" aria-modal="true" aria-label={title}><button type="button" className="modal-close shortcut-close" onClick={requestClose}>×（Esc）</button><h2>{title}</h2>{children}<button className="submit" type="submit">保存する（Enter）</button></form>{confirming&&<DiscardChangesDialog cancel={cancelClose} discard={discardAndClose}/>}</div>;
}

function useFadeClose(close: () => void, listenForCloseEvent = true) { const [closing, setClosing] = useState(false); const timer = useRef<number | null>(null); const closeRef = useRef(close); closeRef.current = close; const requestClose = useCallback(() => { setClosing((current) => { if (current) return current; timer.current = window.setTimeout(() => closeRef.current(), 180); return true; }); }, []); useEffect(() => { const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; if (listenForCloseEvent) window.addEventListener("cosfind-close-modal", requestClose); return () => { document.body.style.overflow = previousOverflow; if (listenForCloseEvent) window.removeEventListener("cosfind-close-modal", requestClose); if (timer.current !== null) window.clearTimeout(timer.current); }; }, [listenForCloseEvent, requestClose]); return { closing, requestClose }; }
function StoreChainFields({ chains, initialChain, initialType }: { chains: Chain[]; initialChain: string; initialType: string }) {
  const initialRegistered = chains.find((chain) => chain.name === initialChain) ?? (initialChain ? { id: "request-chain", name: initialChain, storeType: initialType } : undefined);
  const [chainName, setChainName] = useState(initialRegistered?.name || "");
  const [storeType, setStoreType] = useState(initialRegistered?.storeType || initialType || "");
  const availableChains = [...chains, ...(initialRegistered && !chains.some((chain) => chain.name === initialRegistered.name) ? [initialRegistered] : [])].filter((chain) => chain.storeType === storeType);
  function changeType(type: string) { setStoreType(type); setChainName(""); }
  return <><Field label="店舗カテゴリ（必須）"><select name="type" value={storeType} required onChange={(event) => changeType(event.target.value)}><option value="">店舗カテゴリを選択</option>{STORE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></Field><Field label="チェーン"><select name="chain" value={chainName} disabled={!storeType} onChange={(event) => setChainName(event.target.value)}><option value="">{storeType ? "チェーンなし（個店）" : "先に店舗カテゴリを選択"}</option>{availableChains.map((chain) => <option key={chain.id} value={chain.name}>{chain.name}</option>)}</select>{storeType && availableChains.length === 0 && <small>このカテゴリの登録済みチェーンはありません</small>}</Field></>;
}
