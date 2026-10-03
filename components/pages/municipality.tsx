import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {areaHref} from "@/lib/area-links";
import {formatStoreName} from "@/lib/store-name";
import {getStoreTypeCode} from "@/lib/store-type-code";
import {getStoreTypeColor} from "@/lib/store-type-color";
import type {loadPage} from "@/lib/server/mobile-pages/municipality";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function MunicipalityView({model}:{model:Model}){
const {municipality,prefectureName,municipalityName,areaName,jsonLd}=model;
return <><SiteHeader/><main className="area-directory-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><Link href="/areas">市区町村から探す</Link><span>›</span><Link href={areaHref(prefectureName)}>{prefectureName}</Link><span>›</span><span>{municipalityName}</span></nav>
    <header className="area-directory-hero compact">
      <p className="eyebrow">LOCAL STORE GUIDE</p>
      <h1>{areaName}のコスメ取扱店舗</h1>
      <p>{areaName}でコスメやスキンケアを取り扱う、CosFind登録店舗の一覧です。店舗名、店舗分類、住所から目的のお店を探せます。</p>
      <dl><div><dt>登録店舗</dt><dd>{municipality.stores.length}<small>件</small></dd></div></dl>
    </header>
    <section className="area-store-section" aria-labelledby="store-heading">
      <div className="area-section-heading"><div><h2 id="store-heading">{municipalityName}の登録店舗</h2><p>各店舗の詳細ページで、最近報告された商品や取扱ブランドを確認できます。</p></div><Link href="/">地図から探す</Link></div>
      <div className="area-store-list">{municipality.stores.map((store) => {
        const displayName = formatStoreName(store);
        const color = getStoreTypeColor(store.type);
        return <Link className="area-store-card" href={`/stores/${encodeURIComponent(store.id)}`} key={store.id} aria-label={`${displayName}の詳細を見る`}>
          <div className="area-store-code" style={{ backgroundColor: color.background, color: color.foreground }}>{getStoreTypeCode(store.type)}</div>
          <div><p>{store.type}</p><h2>{displayName}</h2><address>{store.address}</address>{store.stationNames.length>0&&<div className="station-tags compact">{store.stationNames.map(name=><span key={name}>{name}</span>)}</div>}</div>
        </Link>;
      })}</div>
    </section>
    <aside className="area-information-note"><h2>在庫情報について</h2><p>CosFindはリアルタイムの在庫数を保証するサービスではありません。店舗詳細で情報提供日を確認し、来店時の目安としてご利用ください。</p></aside>
  </main></>;
}
