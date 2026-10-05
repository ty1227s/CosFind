import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {areaHref} from "@/lib/area-links";
import type {loadPage} from "@/lib/server/mobile-pages/areas";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function AreasView({model}:{model:Model}){
const {directory,storeCount,municipalityCount}=model;
return <><SiteHeader/><main className="area-directory-page">
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><span>市区町村から探す</span></nav>
    <header className="area-directory-hero">
      <p className="eyebrow">AREA DIRECTORY</p>
      <h1>市区町村からコスメ取扱店舗を探す</h1>
      <p>都道府県、市区町村の順に選ぶと、CosFindに登録されているコスメ・スキンケア取扱店舗を確認できます。</p>
      <dl><div><dt>登録店舗</dt><dd>{storeCount}<small>件</small></dd></div><div><dt>掲載地域</dt><dd>{municipalityCount}<small>市区町村</small></dd></div></dl>
    </header>
    {directory.length ? <section className="area-prefecture-section" aria-labelledby="prefecture-heading">
      <h2 id="prefecture-heading">都道府県を選択</h2>
      <div className="area-prefecture-grid">{directory.map((prefecture) => <Link href={areaHref(prefecture.name)} key={prefecture.name}>
        <span><b>{prefecture.name}</b><small>{prefecture.municipalityCount}市区町村</small></span><strong>{prefecture.storeCount}<small>件</small></strong>
      </Link>)}</div>
    </section> : <div className="area-empty"><b>掲載できる店舗がまだありません</b><p>登録店舗が公開されると、地域別に表示されます。</p></div>}
  </main></>;
}
