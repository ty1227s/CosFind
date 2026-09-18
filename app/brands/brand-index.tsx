import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Brand = { id: string; name: string; name_kana: string | null };
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const hiragana = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".split("");
const smallKana: Record<string, string> = { ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お", ゃ: "や", ゅ: "ゆ", ょ: "よ", っ: "つ", ゎ: "わ" };

function kanaInitial(value: string) {
  const first = value.trim().normalize("NFKC")[0];
  if (!first) return "その他";
  const code = first.charCodeAt(0);
  const kana = code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : first;
  const plain = kana.normalize("NFD").replace(/[\u3099\u309a]/g, "").normalize("NFC");
  return smallKana[plain] || (hiragana.includes(plain) ? plain : "その他");
}

function brandInitial(brand: Brand) {
  const first = brand.name.trim().normalize("NFKC")[0] || "";
  if (/^[A-Za-z]$/.test(first)) return first.toUpperCase();
  return brand.name_kana ? kanaInitial(brand.name_kana) : "その他";
}

function initialButton(initial: string, count: number, selected: string) {
  if (!count) return <span key={initial} className="disabled" aria-disabled="true">{initial}<small>0</small></span>;
  const slug = initial === "その他" ? "other" : encodeURIComponent(initial);
  return <Link key={initial} className={selected === initial ? "active" : ""} href={`/brands/${slug}`}>{initial}<small>{count}</small></Link>;
}

export async function BrandIndex({ requested = "" }: { requested?: string }) {
  const selected = [...alphabet, ...hiragana, "その他"].includes(requested) ? requested : "";
  let brands: Brand[] = [];
  let error = "";
  try {
    const result = await createSupabaseAdminClient().from("brands").select("id,name,name_kana").order("name");
    if (result.error) throw result.error;
    brands = (result.data ?? []) as Brand[];
  } catch { error = "ブランド一覧を取得できませんでした。"; }
  const counts = new Map<string, number>();
  brands.forEach((brand) => { const key = brandInitial(brand); counts.set(key, (counts.get(key) || 0) + 1); });
  const shown = selected ? brands.filter((brand) => brandInitial(brand) === selected) : [];
  return <>
    <SiteHeader />
    <main className="brand-index-page"><section>
      <header className="brand-index-head"><div><p className="eyebrow">BRAND INDEX</p><h1>ブランドから探す</h1><p>ブランド名の頭文字を選んで商品を探せます。</p></div><Link href="/">トップページへ戻る</Link></header>
      <details className="brand-initial-selector" open={!selected}>
        <summary><b>{selected ? `選択中：${selected}` : "ブランドの頭文字を選択"}</b><span className="selector-open-label">頭文字一覧を閉じる <i>⌃</i></span><span className="selector-closed-label">頭文字を変更 <i>⌄</i></span></summary>
        <nav className="brand-initial-groups">
          <div><b>A–Z</b><span>{alphabet.map((letter) => initialButton(letter, counts.get(letter) || 0, selected))}</span></div>
          <div><b>あ–ん</b><span>{hiragana.map((letter) => initialButton(letter, counts.get(letter) || 0, selected))}</span></div>
          <div><b>その他</b><span>{initialButton("その他", counts.get("その他") || 0, selected)}</span></div>
        </nav>
      </details>
      {error ? <p className="form-error">{error}</p> : selected ? <section className="brand-index-results">
        <div><h2>{selected} から始まるブランド</h2><span>{shown.length}件</span></div>
        {shown.length ? <div className="brand-index-list">{shown.map((brand) => <Link key={brand.id} href={`/products?brand=${encodeURIComponent(brand.name)}`}><b>{brand.name}</b></Link>)}</div> : <p className="brand-index-empty">該当するブランドはありません。</p>}
      </section> : null}
    </section></main>
  </>;
}
