import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { decodeAreaSegment, getStationDirectory, publicSiteOrigin, stationHref } from "@/lib/area-directory";
import { formatStoreName } from "@/lib/store-name";
import { getStoreTypeCode } from "@/lib/store-type-code";
import { getStoreTypeColor } from "@/lib/store-type-color";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ station: string }> };

async function getStation(params: PageProps["params"]) {
  const stationName = decodeAreaSegment((await params).station);
  const station = (await getStationDirectory()).find((item) => item.name === stationName);
  return { stationName, station };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { stationName, station } = await getStation(params);
  if (!station) return { title: "駅が見つかりません | CosFind", robots: { index: false, follow: false } };
  const title = `${stationName}周辺のコスメ取扱店舗一覧 | CosFind`;
  const lineText = station.lineNames.length ? `${station.lineNames.join("、")}沿線の` : "";
  const description = `${stationName}周辺で${lineText}コスメ・スキンケアを取り扱う登録店舗${station.stores.length}件を掲載。店舗名、住所、店舗分類、最近の報告情報を確認できます。`;
  const url = `${publicSiteOrigin}${stationHref(stationName)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}

export default async function StationPage({ params }: PageProps) {
  const { stationName, station } = await getStation(params);
  if (!station) notFound();
  const pageUrl = `${publicSiteOrigin}${stationHref(stationName)}`;
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: publicSiteOrigin },
      { "@type": "ListItem", position: 2, name: "駅から探す", item: `${publicSiteOrigin}/stations` },
      { "@type": "ListItem", position: 3, name: stationName, item: pageUrl },
    ] },
    { "@type": "ItemList", name: `${stationName}周辺のコスメ取扱店舗`, numberOfItems: station.stores.length, itemListElement: station.stores.map((store, index) => ({
      "@type": "ListItem", position: index + 1, item: { "@type": "Store", name: formatStoreName(store), url: `${publicSiteOrigin}/stores/${encodeURIComponent(store.id)}`, address: store.address },
    })) },
  ] };
  return <><SiteHeader/><main className="area-directory-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><Link href="/stations">駅から探す</Link><span>›</span><span>{stationName}</span></nav>
    <header className="area-directory-hero compact">
      <p className="eyebrow">STATION STORE GUIDE</p>
      <h1>{stationName}周辺のコスメ取扱店舗</h1>
      <p>{stationName}が最寄り駅・周辺駅として登録されている、コスメやスキンケアの取扱店舗一覧です。</p>
      {station.lineNames.length > 0 && <div className="station-line-list" aria-label="乗り入れ路線">{station.lineNames.map((line) => <span key={line}>{line}</span>)}</div>}
      <dl><div><dt>登録店舗</dt><dd>{station.stores.length}<small>件</small></dd></div></dl>
    </header>
    <section className="area-store-section" aria-labelledby="station-store-heading">
      <div className="area-section-heading"><div><h2 id="station-store-heading">{stationName}の登録店舗</h2><p>店舗詳細で最近報告された商品や取扱ブランドを確認できます。</p></div><Link href={`/?station=${encodeURIComponent(stationName)}`}>地図から探す</Link></div>
      <div className="area-store-list">{station.stores.map((store) => {
        const displayName = formatStoreName(store); const color = getStoreTypeColor(store.type);
        return <Link className="area-store-card" href={`/stores/${encodeURIComponent(store.id)}`} key={store.id} aria-label={`${displayName}の詳細を見る`}>
          <div className="area-store-code" style={{ backgroundColor: color.background, color: color.foreground }}>{getStoreTypeCode(store.type)}</div>
          <div><p>{store.type}</p><h2>{displayName}</h2><address>{store.address}</address><div className="station-tags compact">{store.stationNames.map(name=><span className={name===stationName?"active":""} key={name}>{name}</span>)}</div></div>
        </Link>;
      })}</div>
    </section>
    <aside className="area-information-note"><h2>在庫情報について</h2><p>掲載されているのは利用者から寄せられた目撃情報です。現在の在庫を保証するものではありません。</p></aside>
  </main></>;
}
