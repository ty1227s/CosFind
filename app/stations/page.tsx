import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getStationDirectory, publicSiteOrigin, stationHref } from "@/lib/area-directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "駅からコスメ取扱店舗を探す | CosFind",
  description: "駅名別に、コスメ・スキンケアを取り扱うドラッグストア、バラエティショップ、スーパーなどの登録店舗を探せます。",
  alternates: { canonical: `${publicSiteOrigin}/stations` },
  openGraph: { title: "駅からコスメ取扱店舗を探す | CosFind", description: "駅名を選んで周辺のコスメ取扱店舗を確認できます。", url: `${publicSiteOrigin}/stations`, type: "website" },
};

export default async function StationsPage() {
  const stations = await getStationDirectory();
  const storeCount = new Set(stations.flatMap((station) => station.stores.map((store) => store.id))).size;
  return <><SiteHeader/><main className="area-directory-page">
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><span>駅から探す</span></nav>
    <header className="area-directory-hero">
      <p className="eyebrow">STATION DIRECTORY</p>
      <h1>駅からコスメ取扱店舗を探す</h1>
      <p>駅名を選ぶと、同じ駅名タグが登録されているコスメ・スキンケア取扱店舗をまとめて確認できます。</p>
      <dl><div><dt>登録駅名</dt><dd>{stations.length}<small>駅</small></dd></div><div><dt>対象店舗</dt><dd>{storeCount}<small>件</small></dd></div></dl>
    </header>
    {stations.length ? <section className="area-municipality-section" aria-labelledby="station-heading">
      <h2 id="station-heading">駅名を選択</h2>
      <div className="area-municipality-grid station-directory-grid">{stations.map((station) => <Link href={stationHref(station.name)} key={station.name}>
        <span className="station-directory-name"><b>{station.name}</b>{station.lineNames.length > 0 && <small>{station.lineNames.join("・")}</small>}</span><span>{station.stores.length}<small>件</small></span>
      </Link>)}</div>
    </section> : <div className="area-empty"><b>駅名タグはまだ登録されていません</b><p>管理画面で店舗へ駅名を追加すると、ここに自動表示されます。</p></div>}
  </main></>;
}
