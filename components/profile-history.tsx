"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "./site-header";

type HistoryKind = "reports" | "products" | "stores";
type HistoryResponse = { items: Record<string, unknown>[]; page: number; pageSize: number; total: number; totalPages: number; error?: string };

const tabs: Record<HistoryKind, { label: string; href: string; eyebrow: string; title: string }> = {
  reports: { label: "在庫報告", href: "/profile/history/reports", eyebrow: "STOCK REPORTS", title: "在庫報告履歴" },
  products: { label: "商品申請", href: "/profile/history/products", eyebrow: "PRODUCT REQUESTS", title: "商品申請履歴" },
  stores: { label: "店舗申請", href: "/profile/history/stores", eyebrow: "STORE REQUESTS", title: "店舗申請履歴" },
};

const statusLabels: Record<string, string> = {
  available: "在庫あり", low_stock: "残りわずか", sold_out: "商品なし", unknown: "不明", discontinued: "取扱終了",
  pending: "確認待ち", approved: "承認済み", rejected: "却下",
};
const methodLabels: Record<string, string> = { store_visit: "店頭で確認", staff_confirmation: "店員に確認", phone: "電話で確認", official_information: "公式情報" };

export function ProfileHistory({ kind }: { kind: HistoryKind }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    void fetch(`/api/auth/history?kind=${kind}&page=${page}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as HistoryResponse;
        if (!response.ok) throw new Error(result.error || "履歴を読み込めませんでした");
        setData(result);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "履歴を読み込めませんでした");
      });
    return () => controller.abort();
  }, [kind, page]);

  const selected = tabs[kind];
  const movePage = (next: number) => router.push(`${selected.href}?page=${next}`);

  return <>
    <SiteHeader />
    <main className="report-history-page">
      <section className="report-history-card">
        <nav className={`history-tabs history-tabs-${kind}`} aria-label="投稿・申請履歴">
          {(Object.keys(tabs) as HistoryKind[]).map((tabKind) => <Link key={tabKind} href={tabs[tabKind].href} className={tabKind === kind ? "active" : ""} aria-current={tabKind === kind ? "page" : undefined}>{tabs[tabKind].label}</Link>)}
        </nav>
        <div className="history-heading">
          <div><p className="eyebrow">{selected.eyebrow}</p><h1>{selected.title}</h1><p>新しいものから20件ずつ表示します。</p></div>
          <Link href="/profile">プロフィールへ戻る</Link>
        </div>

        {error ? <div className="history-empty"><p className="form-error">{error}</p>{error === "ログインが必要です" && <Link href="/login">ログインする</Link>}</div>
          : !data ? <div className="history-empty" aria-live="polite">読み込み中…</div>
          : <>
            <div className="history-count">全 <b>{data.total}</b> 件</div>
            {data.items.length ? <div className="history-list">{data.items.map((item) => kind === "reports" ? <ReportRow key={String(item.id)} item={item} /> : <RequestRow key={String(item.id)} item={item} kind={kind} />)}</div>
              : <div className="history-empty">まだ{selected.title}はありません。</div>}
            {data.totalPages > 1 && <nav className="history-pagination" aria-label="履歴ページ">
              <button type="button" disabled={data.page <= 1} onClick={() => movePage(data.page - 1)}>前の20件</button>
              <span><b>{data.page}</b> / {data.totalPages}</span>
              <button type="button" disabled={data.page >= data.totalPages} onClick={() => movePage(data.page + 1)}>次の20件</button>
            </nav>}
          </>}
      </section>
    </main>
  </>;
}

function ReportRow({ item }: { item: Record<string, unknown> }) {
  const product = relation(item.products);
  const brand = relation(product.brands);
  const variant = relation(item.product_variants);
  const store = relation(item.stores);
  const productId = text(product.id);
  const storeId = text(store.id);
  return <article className="history-row">
    <div className="history-row-main"><span className="history-status">{statusLabels[text(item.status)] || text(item.status)}</span><h2>{productId ? <Link href={`/products/${productId}`}>{text(product.name) || "商品情報なし"}</Link> : text(product.name) || "商品情報なし"}</h2><p>{text(brand.name)}{variant.variant_name ? ` / ${text(variant.color_code) ? `${text(variant.color_code)} ` : ""}${text(variant.variant_name)}` : ""}</p></div>
    <dl><div><dt>店舗</dt><dd>{storeId ? <Link href={`/stores/${storeId}`}>{storeName(store)}</Link> : storeName(store)}</dd></div><div><dt>確認方法</dt><dd>{methodLabels[text(item.confirmation_method)] || "—"}</dd></div><div><dt>報告日時</dt><dd>{formatDate(item.reported_at)}</dd></div>{item.comment ? <div className="history-comment"><dt>コメント</dt><dd>{text(item.comment)}</dd></div> : null}</dl>
  </article>;
}

function RequestRow({ item, kind }: { item: Record<string, unknown>; kind: "products" | "stores" }) {
  const payload = record(item.payload);
  const name = text(payload.name) || (kind === "products" ? "商品名なし" : "店舗名なし");
  return <article className="history-row">
    <div className="history-row-main"><span className={`history-status status-${text(item.status)}`}>{statusLabels[text(item.status)] || text(item.status)}</span><h2>{name}</h2><p>{kind === "products" ? [text(payload.brand), text(payload.category)].filter(Boolean).join(" / ") : [text(payload.chain), text(payload.type)].filter(Boolean).join(" / ") || "個店"}</p></div>
    <dl>{kind === "products" ? <><div><dt>カラー</dt><dd>{[text(payload.colorCode), text(payload.variantName)].filter(Boolean).join(" ") || "—"}</dd></div><div><dt>JANコード</dt><dd>{text(payload.janCode) || "—"}</dd></div><div><dt>PA</dt><dd>{text(payload.pa) || "未設定"}</dd></div>{text(payload.reportStoreId)&&<div><dt>発見情報</dt><dd>商品承認後に在庫報告へ反映</dd></div>}</> : <div><dt>住所</dt><dd>{text(payload.address) || "未入力"}</dd></div>}<div><dt>申請日時</dt><dd>{formatDate(item.created_at)}</dd></div></dl>
  </article>;
}

function relation(value: unknown): Record<string, unknown> { return Array.isArray(value) ? record(value[0]) : record(value); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function formatDate(value: unknown): string { const date = new Date(text(value)); return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ja-JP"); }
function storeName(store: Record<string, unknown>): string { const name = text(store.name) || "店舗情報なし"; const chain = text(store.chain_name); return chain && !name.startsWith(chain) ? `${chain} ${name}` : name; }
