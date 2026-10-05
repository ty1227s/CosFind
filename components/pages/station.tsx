import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {railwayLineHref} from "@/lib/area-links";
import {formatStoreName} from "@/lib/store-name";
import {getStoreTypeCode} from "@/lib/store-type-code";
import {getStoreTypeColor} from "@/lib/store-type-color";
import type {loadPage} from "@/lib/server/mobile-pages/station";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function StationView({model}:{model:Model}){
const {stationName,station,jsonLd}=model;
return <><SiteHeader/><main className="area-directory-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><Link href="/stations">駅から探す</Link><span>›</span><span>{stationName}</span></nav>
    <header className="area-directory-hero compact">
      <p className="eyebrow">STATION STORE GUIDE</p>
      <h1>{stationName}周辺のコスメ取扱店舗</h1>
      <p>{stationName}が最寄り駅・周辺駅として登録されている、コスメやスキンケアの取扱店舗一覧です。</p>
      {(station.prefecture||station.municipality)&&<p className="station-location">所在地：{station.prefecture}{station.municipality ? ` ${station.municipality}` : ""}</p>}
      {station.lineNames.length > 0 && <div className="station-line-list" aria-label="乗り入れ路線">{station.lineNames.map((line) => <Link href={railwayLineHref(line)} key={line}>{line}</Link>)}</div>}
      <dl><div><dt>登録店舗</dt><dd>{station.stores.length}<small>件</small></dd></div></dl>
    </header>
    <section className="area-store-section" aria-labelledby="station-store-heading">
      <div className="area-section-heading"><div><h2 id="station-store-heading">{stationName}の登録店舗</h2><p>店舗詳細で最近報告された商品や取扱ブランドを確認できます。</p></div><Link href={`/?station=${encodeURIComponent(stationName)}`}>地図から探す</Link></div>
      <div className="area-store-list">{station.stores.map((store) => {
        const displayName = formatStoreName(store); const color = getStoreTypeColor(store.type);
        return <Link className="area-store-card" href={`/stores/${encodeURIComponent(store.id)}`} key={store.id} aria-label={`${displayName}の詳細を見る`}>
          <div className="area-store-code" style={{ backgroundColor: color.background, color: color.foreground }}>{getStoreTypeCode(store.type)}</div>
          <div><p>{store.type}</p><h2>{displayName}</h2><address>{store.address}</address></div>
        </Link>;
      })}</div>
    </section>
    <aside className="area-information-note"><h2>在庫情報について</h2><p>掲載されているのは利用者から寄せられた目撃情報です。現在の在庫を保証するものではありません。</p></aside>
  </main></>;
}
