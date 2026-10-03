import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const hiragana = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".split("");
function initialButton(initial: string, count: number, selected: string) {
  if (!count) return <span key={initial} className="disabled" aria-disabled="true">{initial}<small>0</small></span>;
  const slug = initial === "その他" ? "other" : encodeURIComponent(initial);
  return <Link key={initial} className={selected === initial ? "active" : ""} href={`/brands/${slug}`}>{initial}<small>{count}</small></Link>;
}
import type {loadPage} from "@/lib/server/mobile-pages/brands";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function BrandsView({model}:{model:Model}){
const {selected,error,initialCounts,shown}=model;
return <>
    <SiteHeader />
    <main className="brand-index-page"><section>
      <header className="brand-index-head"><div><p className="eyebrow">BRAND INDEX</p><h1>ブランドから探す</h1><p>ブランド名の頭文字を選んで商品を探せます。</p></div><Link href="/">トップページへ戻る</Link></header>
      <details className="brand-initial-selector" open={!selected}>
        <summary><b>{selected ? `選択中：${selected}` : "ブランドの頭文字を選択"}</b><span className="selector-open-label">頭文字一覧を閉じる <i>⌃</i></span><span className="selector-closed-label">頭文字を変更 <i>⌄</i></span></summary>
        <nav className="brand-initial-groups">
          <div><b>A–Z</b><span>{alphabet.map((letter) => initialButton(letter, initialCounts[letter] || 0, selected))}</span></div>
          <div><b>あ–ん</b><span>{hiragana.filter((letter) => (initialCounts[letter] || 0) > 0).map((letter) => initialButton(letter, initialCounts[letter] || 0, selected))}</span></div>
          <div><b>その他</b><span>{initialButton("その他", initialCounts["その他"] || 0, selected)}</span></div>
        </nav>
      </details>
      {error ? <p className="form-error">{error}</p> : selected ? <section className="brand-index-results">
        <div><h2>{selected} から始まるブランド</h2><span>{shown.length}件</span></div>
        {shown.length ? <div className="brand-index-list">{shown.map((brand) => <Link key={brand.id} href={`/brands/detail/${brand.id}`}><b>{brand.name}</b></Link>)}</div> : <p className="brand-index-empty">該当するブランドはありません。</p>}
      </section> : null}
    </section></main>
  </>;
}
