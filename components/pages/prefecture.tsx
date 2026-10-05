import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {areaHref} from "@/lib/area-links";
import type {loadPage} from "@/lib/server/mobile-pages/prefecture";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function PrefectureView({model}:{model:Model}){
const {prefecture}=model;
return <><SiteHeader/><main className="area-directory-page">
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><Link href="/areas">市区町村から探す</Link><span>›</span><span>{prefecture.name}</span></nav>
    <header className="area-directory-hero compact">
      <p className="eyebrow">{prefecture.name.toUpperCase()} AREA</p>
      <h1>{prefecture.name}のコスメ取扱店舗</h1>
      <p>{prefecture.name}内の市区町村を選択すると、コスメ・スキンケアの取扱店舗を住所と店舗分類から探せます。</p>
      <dl><div><dt>登録店舗</dt><dd>{prefecture.storeCount}<small>件</small></dd></div><div><dt>掲載地域</dt><dd>{prefecture.municipalities.length}<small>市区町村</small></dd></div></dl>
    </header>
    <section className="area-municipality-section" aria-labelledby="municipality-heading">
      <h2 id="municipality-heading">市区町村を選択</h2>
      <div className="area-municipality-grid">{prefecture.municipalities.map((municipality) => <Link href={areaHref(prefecture.name, municipality.name)} key={municipality.name}>
        <b>{municipality.name}</b><span>{municipality.storeCount}<small>件</small></span>
      </Link>)}</div>
    </section>
  </main></>;
}
