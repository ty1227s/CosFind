import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { decodeAreaSegment, getRailwayLineDirectory, publicSiteOrigin, railwayLineHref, stationHref } from "@/lib/area-directory";

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
  const title = `${lineName}の駅一覧 | CosFind`;
  const description = `${lineName}に登録されている${line.stations.length}駅を路線順に掲載しています。駅名から周辺のコスメ・スキンケア取扱店舗を確認できます。`;
  const url = `${publicSiteOrigin}${railwayLineHref(lineName)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website", ...(line.visualType==="image"&&line.imageUrl?{images:[line.imageUrl]}:{}) } };
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
      <p className="eyebrow">RAILWAY LINE GUIDE</p><div className="railway-line-page-title">{line.visualType==="image"&&line.imageUrl?<img src={line.imageUrl} alt={`${lineName}の路線記号`}/>:line.lineColor?<i className="railway-line-color-mark" style={{backgroundColor:line.lineColor}}/>:null}<h1>{lineName}の駅一覧</h1></div>
      {line.companies.length>0&&<p className="railway-line-company">運行会社：{line.companies.join(" / ")}</p>}
      <p>駅名を選ぶと、その駅周辺に登録されている店舗を詳しく確認できます。</p>
      <dl><div><dt>登録駅</dt><dd>{line.stations.length}<small>駅</small></dd></div></dl>
    </header>
    <section className="area-municipality-section" aria-labelledby="line-station-heading"><h2 id="line-station-heading">登録駅</h2>
      <ol className="railway-station-sequence">{line.stations.map((station,index)=><li key={station.name}><Link href={stationHref(station.name)}><i>{index+1}</i><span><b>{station.name}</b><small>{station.stores.length}件の登録店舗</small></span></Link></li>)}</ol>
    </section>
  </main></>;
}
