import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {stationHref} from "@/lib/area-links";
import type {loadPage} from "@/lib/server/mobile-pages/line";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function LineView({model}:{model:Model}){
const {lineName,line,jsonLd}=model;
const stationMarkerColor=line.lineColor||"#c32673";
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
      <ol className="railway-station-sequence">{line.stations.map((station)=><li key={station.name}><Link href={stationHref(station.name)}><i className="railway-station-color-dot" style={{backgroundColor:stationMarkerColor}} aria-hidden="true"/><span><b>{station.name}</b><small>{station.stores.length}件の登録店舗</small></span></Link></li>)}</ol>
    </section>
  </main></>;
}
