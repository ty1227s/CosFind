import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { decodeAreaSegment, getRailwayLineDirectory, publicSiteOrigin, railwayLineHref, stationHref } from "@/lib/area-directory";
import { formatStoreName } from "@/lib/store-name";
import { getStoreTypeCode } from "@/lib/store-type-code";
import { getStoreTypeColor } from "@/lib/store-type-color";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ line: string }> };

async function getLine(params: PageProps["params"]) {
  const lineName = decodeAreaSegment((await params).line);
  const line = (await getRailwayLineDirectory()).find((item) => item.name === lineName);
  return { lineName, line };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lineName, line } = await getLine(params);
  if (!line) return { title: "路線が見つかりません | CosFind", robots: { index: false, follow: false } };
  const title = `${lineName}沿線のコスメ取扱店舗・駅一覧 | CosFind`;
  const description = `${lineName}の登録駅${line.stations.length}駅と、沿線のコスメ・スキンケア取扱店舗${line.stores.length}件を掲載しています。`;
  const url = `${publicSiteOrigin}${railwayLineHref(lineName)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}

export default async function RailwayLinePage({ params }: PageProps) {
  const { lineName, line } = await getLine(params);
  if (!line) notFound();
  const pageUrl = `${publicSiteOrigin}${railwayLineHref(lineName)}`;
  const jsonLd = { "@context":"https://schema.org", "@graph":[
    { "@type":"BreadcrumbList", itemListElement:[
      { "@type":"ListItem", position:1, name:"ホーム", item:publicSiteOrigin },
      { "@type":"ListItem", position:2, name:"路線から探す", item:`${publicSiteOrigin}/lines` },
      { "@type":"ListItem", position:3, name:lineName, item:pageUrl },
    ]},
    { "@type":"ItemList", name:`${lineName}の登録駅`, numberOfItems:line.stations.length, itemListElement:line.stations.map((station,index)=>({"@type":"ListItem",position:index+1,name:station.name,url:`${publicSiteOrigin}${stationHref(station.name)}`})) },
  ]};
  return <><SiteHeader/><main className="area-directory-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,"\\u003c")}}/>
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><Link href="/lines">路線から探す</Link><span>›</span><span>{lineName}</span></nav>
    <header className="area-directory-hero compact">
      <p className="eyebrow">RAILWAY LINE STORE GUIDE</p><h1>{lineName}沿線のコスメ取扱店舗</h1>
      <p>駅名を選ぶと、その駅周辺に登録されている店舗を詳しく確認できます。</p>
      <dl><div><dt>登録駅</dt><dd>{line.stations.length}<small>駅</small></dd></div><div><dt>沿線店舗</dt><dd>{line.stores.length}<small>件</small></dd></div></dl>
    </header>
    <section className="area-municipality-section" aria-labelledby="line-station-heading"><h2 id="line-station-heading">登録駅</h2>
      <ol className="railway-station-sequence">{line.stations.map((station,index)=><li key={station.name}><Link href={stationHref(station.name)}><i>{index+1}</i><span><b>{station.name}</b><small>{station.stores.length}件の登録店舗</small></span></Link></li>)}</ol>
    </section>
    <section className="area-store-section" aria-labelledby="line-store-heading"><div className="area-section-heading"><div><h2 id="line-store-heading">{lineName}沿線の登録店舗</h2><p>駅の重複を除いた店舗一覧です。</p></div></div>
      <div className="area-store-list">{line.stores.map((store)=>{const color=getStoreTypeColor(store.type);const displayName=formatStoreName(store);return <Link className="area-store-card" href={`/stores/${encodeURIComponent(store.id)}`} key={store.id}><div className="area-store-code" style={{backgroundColor:color.background,color:color.foreground}}>{getStoreTypeCode(store.type)}</div><div><p>{store.type}</p><h2>{displayName}</h2><address>{store.address}</address><div className="station-tags compact">{store.stationNames.filter((name)=>line.stations.some((station)=>station.name===name)).map((name)=><span key={name}>{name}</span>)}</div></div></Link>})}</div>
    </section>
    <aside className="area-information-note"><h2>在庫情報について</h2><p>掲載されているのは利用者から寄せられた目撃情報です。現在の在庫を保証するものではありません。</p></aside>
  </main></>;
}
