import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {stationHref} from "@/lib/area-links";
import type {loadPage} from "@/lib/server/mobile-pages/stations";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function StationsView({model}:{model:Model}){
const {stations,storeCount,stationCount,page,pageCount}=model;
return <><SiteHeader/><main className="area-directory-page">
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><span>駅から探す</span></nav>
    <header className="area-directory-hero">
      <p className="eyebrow">STATION DIRECTORY</p>
      <h1>駅からコスメ取扱店舗を探す</h1>
      <p>駅名を選ぶと、同じ駅名タグが登録されているコスメ・スキンケア取扱店舗をまとめて確認できます。</p>
      <dl><div><dt>登録駅名</dt><dd>{stationCount}<small>駅</small></dd></div><div><dt>対象店舗</dt><dd>{storeCount}<small>件</small></dd></div></dl>
    </header>
    {stations.length ? <section className="area-municipality-section" aria-labelledby="station-heading">
      <h2 id="station-heading">駅名を選択</h2>
      <div className="area-municipality-grid station-directory-grid">{stations.map((station) => <Link href={stationHref(station.name)} key={station.name}>
        <span className="station-directory-name"><b>{station.name}</b>{(station.prefecture||station.municipality)&&<small>{station.prefecture}{station.municipality ? ` ${station.municipality}` : ""}</small>}{station.lineNames.length > 0 && <small>{station.lineNames.join("・")}</small>}</span><span>{station.storeCount}<small>件</small></span>
      </Link>)}</div>
      {pageCount>1&&<nav className="directory-pagination" aria-label="駅一覧のページ切り替え">{page>1?<Link href={`/stations?page=${page-1}`}>← 前へ</Link>:<span/>}<b>{page} / {pageCount}</b>{page<pageCount?<Link href={`/stations?page=${page+1}`}>次へ →</Link>:<span/>}</nav>}
    </section> : <div className="area-empty"><b>駅名タグはまだ登録されていません</b><p>管理画面で店舗へ駅名を追加すると、ここに自動表示されます。</p></div>}
  </main></>;
}
