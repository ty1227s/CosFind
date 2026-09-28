import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getRailwayLineDirectory, publicSiteOrigin, railwayLineHref } from "@/lib/area-directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "路線からコスメ取扱店舗を探す | CosFind",
  description: "鉄道路線別に駅をたどり、各駅周辺のコスメ・スキンケア取扱店舗を探せます。",
  alternates: { canonical: `${publicSiteOrigin}/lines` },
  openGraph: { title: "路線からコスメ取扱店舗を探す | CosFind", description: "路線と駅を選んで周辺のコスメ取扱店舗を確認できます。", url: `${publicSiteOrigin}/lines`, type: "website" },
};

export default async function RailwayLinesPage() {
  const lines = await getRailwayLineDirectory();
  const stationCount = new Set(lines.flatMap((line) => line.stations.map((station) => station.name))).size;
  return <><SiteHeader/><main className="area-directory-page">
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><span>路線から探す</span></nav>
    <header className="area-directory-hero">
      <p className="eyebrow">RAILWAY LINE DIRECTORY</p>
      <h1>路線からコスメ取扱店舗を探す</h1>
      <p>路線を選ぶと、登録順に並んだ駅と、沿線のコスメ・スキンケア取扱店舗を確認できます。</p>
      <dl><div><dt>登録路線</dt><dd>{lines.length}<small>路線</small></dd></div><div><dt>登録駅</dt><dd>{stationCount}<small>駅</small></dd></div></dl>
    </header>
    {lines.length ? <section className="area-municipality-section" aria-labelledby="line-heading">
      <h2 id="line-heading">路線を選択</h2>
      <div className="area-municipality-grid railway-line-directory-grid">{lines.map((line) => <Link href={railwayLineHref(line.name)} key={line.name}>
        <span className="station-directory-name"><b>{line.name}</b></span><span>{line.stations.length}<small>駅</small></span>
      </Link>)}</div>
    </section> : <div className="area-empty"><b>路線はまだ登録されていません</b><p>管理画面で路線と駅順を登録すると、ここに自動表示されます。</p></div>}
  </main></>;
}
