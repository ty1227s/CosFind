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

type PageProps = { searchParams: Promise<{ company?: string }> };
const UNASSIGNED_COMPANY = "__unassigned__";

export default async function RailwayLinesPage({ searchParams }: PageProps) {
  const lines = await getRailwayLineDirectory();
  const requestedCompany = (await searchParams).company?.trim() ?? "";
  const companies = [...new Set(lines.flatMap((line) => line.companies).filter(Boolean))].sort((left, right) => left.localeCompare(right, "ja"));
  const unassignedLines = lines.filter((line) => line.companies.length === 0);
  const selectedCompany = companies.includes(requestedCompany) || (requestedCompany === UNASSIGNED_COMPANY && unassignedLines.length > 0) ? requestedCompany : "";
  const visibleLines = selectedCompany === UNASSIGNED_COMPANY ? unassignedLines : selectedCompany ? lines.filter((line) => line.companies.includes(selectedCompany)) : [];
  const selectedCompanyLabel = selectedCompany === UNASSIGNED_COMPANY ? "鉄道会社未登録" : selectedCompany;
  const stationCount = new Set(lines.flatMap((line) => line.stations.map((station) => station.name))).size;
  return <><SiteHeader/><main className="area-directory-page">
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><span>路線から探す</span></nav>
    <header className="area-directory-hero">
      <p className="eyebrow">RAILWAY LINE DIRECTORY</p>
      <h1>路線からコスメ取扱店舗を探す</h1>
      <p>鉄道会社、路線の順に選ぶと、登録順に並んだ駅と、沿線のコスメ・スキンケア取扱店舗を確認できます。</p>
      <dl><div><dt>登録路線</dt><dd>{lines.length}<small>路線</small></dd></div><div><dt>登録駅</dt><dd>{stationCount}<small>駅</small></dd></div></dl>
    </header>
    {lines.length ? selectedCompany ? <section className="area-municipality-section" aria-labelledby="line-heading">
      <div className="area-section-heading"><div><h2 id="line-heading">{selectedCompanyLabel}の路線</h2><p>路線を選ぶと登録駅を確認できます。</p></div><Link href="/lines">← 鉄道会社一覧へ戻る</Link></div>
      <div className="area-municipality-grid railway-line-directory-grid">{visibleLines.map((line) => <Link href={railwayLineHref(line.name)} key={line.name}>
        <span className="railway-line-card-name">{line.imageUrl&&<img src={line.imageUrl} alt=""/>}<b>{line.name}</b></span><span>{line.stations.length}<small>駅</small></span>
      </Link>)}</div>
    </section> : <section className="area-municipality-section" aria-labelledby="company-heading">
      <h2 id="company-heading">鉄道会社を選択</h2>
      <div className="area-municipality-grid railway-company-directory-grid">{companies.map((company) => <Link href={`/lines?company=${encodeURIComponent(company)}`} key={company}><b>{company}</b><span>{lines.filter((line) => line.companies.includes(company)).length}<small>路線</small></span></Link>)}{unassignedLines.length>0&&<Link href={`/lines?company=${UNASSIGNED_COMPANY}`}><b>鉄道会社未登録</b><span>{unassignedLines.length}<small>路線</small></span></Link>}</div>
    </section> : <div className="area-empty"><b>路線はまだ登録されていません</b><p>管理画面で路線と駅順を登録すると、ここに自動表示されます。</p></div>}
  </main></>;
}
