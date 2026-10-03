import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getRailwayCompanyDirectory, getRailwayLineDirectory, publicSiteOrigin, railwayLineHref } from "@/lib/area-directory";
import { RAILWAY_REGIONS } from "@/lib/railway-regions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "路線からコスメ取扱店舗を探す | CosFind",
  description: "地域、鉄道会社、路線の順に駅をたどり、各駅周辺のコスメ・スキンケア取扱店舗を探せます。",
  alternates: { canonical: `${publicSiteOrigin}/lines` },
  openGraph: { title: "路線からコスメ取扱店舗を探す | CosFind", description: "地域と鉄道会社、路線、駅を選んで周辺のコスメ取扱店舗を確認できます。", url: `${publicSiteOrigin}/lines`, type: "website" },
};

type PageProps = { searchParams: Promise<{ region?: string; company?: string }> };
const UNASSIGNED_REGION = "__unassigned_region__";
const UNASSIGNED_COMPANY = "__unassigned__";

export default async function RailwayLinesPage({ searchParams }: PageProps) {
  const [lines, companyDirectory, params] = await Promise.all([getRailwayLineDirectory(), getRailwayCompanyDirectory(), searchParams]);
  const requestedRegion = params.region?.trim() ?? "";
  const requestedCompany = params.company?.trim() ?? "";
  const unassignedCompanies = companyDirectory.filter((company) => company.regions.length === 0);
  const selectedRegion = RAILWAY_REGIONS.includes(requestedRegion as (typeof RAILWAY_REGIONS)[number]) || (requestedRegion === UNASSIGNED_REGION && unassignedCompanies.length > 0) ? requestedRegion : "";
  const companiesInRegion = selectedRegion === UNASSIGNED_REGION ? unassignedCompanies : selectedRegion ? companyDirectory.filter((company) => company.regions.includes(selectedRegion)) : [];
  const companyNames = companyDirectory.map((company) => company.name);
  const unassignedLines = lines.filter((line) => line.companies.length === 0);
  const selectedCompany = companyNames.includes(requestedCompany) || (requestedCompany === UNASSIGNED_COMPANY && unassignedLines.length > 0) ? requestedCompany : "";
  const visibleLines = selectedCompany === UNASSIGNED_COMPANY ? unassignedLines : selectedCompany ? lines.filter((line) => line.companies.includes(selectedCompany)) : [];
  const selectedCompanyLabel = selectedCompany === UNASSIGNED_COMPANY ? "鉄道会社未登録" : selectedCompany;
  const selectedRegionLabel = selectedRegion === UNASSIGNED_REGION ? "地域未登録" : selectedRegion;
  const stationCount = new Set(lines.flatMap((line) => line.stations.map((station) => station.name))).size;
  return <><SiteHeader/><main className="area-directory-page">
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><span>路線から探す</span></nav>
    <header className="area-directory-hero">
      <p className="eyebrow">RAILWAY LINE DIRECTORY</p>
      <h1>路線からコスメ取扱店舗を探す</h1>
      <p>地域、鉄道会社、路線の順に選ぶと、登録順に並んだ駅と、沿線のコスメ・スキンケア取扱店舗を確認できます。</p>
      <dl><div><dt>登録路線</dt><dd>{lines.length}<small>路線</small></dd></div><div><dt>登録駅</dt><dd>{stationCount}<small>駅</small></dd></div></dl>
    </header>
    {lines.length ? selectedCompany ? <section className="area-municipality-section" aria-labelledby="line-heading">
      <div className="area-section-heading"><div><p className="directory-step-label">地域：{selectedRegionLabel || "指定なし"}</p><h2 id="line-heading">{selectedCompanyLabel}の路線</h2><p>路線を選ぶと登録駅を確認できます。</p></div><Link href={selectedRegion ? `/lines?region=${encodeURIComponent(selectedRegion)}` : "/lines"}>← 鉄道会社一覧へ戻る</Link></div>
      <div className="area-municipality-grid railway-line-directory-grid">{visibleLines.map((line) => <Link href={railwayLineHref(line.name)} key={line.name}>
        <span className="railway-line-card-name">{line.visualType==="image"&&line.imageUrl?<img src={line.imageUrl} alt=""/>:line.lineColor?<i className="railway-line-color-mark" style={{backgroundColor:line.lineColor}}/>:null}<b>{line.name}</b></span><span>{line.stations.length}<small>駅</small></span>
      </Link>)}</div>
    </section> : selectedRegion ? <section className="area-municipality-section" aria-labelledby="company-heading">
      <div className="area-section-heading"><div><h2 id="company-heading">{selectedRegionLabel}の鉄道会社</h2><p>鉄道会社を選ぶと登録路線を確認できます。</p></div><Link href="/lines">← 地域一覧へ戻る</Link></div>
      <div className="area-municipality-grid railway-company-directory-grid">{companiesInRegion.map((company) => <Link href={`/lines?region=${encodeURIComponent(selectedRegion)}&company=${encodeURIComponent(company.name)}`} key={company.name}><b>{company.name}</b><span>{company.lineCount}<small>路線</small></span></Link>)}{selectedRegion === UNASSIGNED_REGION && unassignedLines.length > 0 && <Link href={`/lines?region=${UNASSIGNED_REGION}&company=${UNASSIGNED_COMPANY}`}><b>鉄道会社未登録</b><span>{unassignedLines.length}<small>路線</small></span></Link>}</div>
    </section> : <section className="area-municipality-section" aria-labelledby="region-heading">
      <h2 id="region-heading">地域を選択</h2>
      <p className="directory-step-description">地域を選ぶと、その地域で運行している鉄道会社を表示します。</p>
      <div className="area-municipality-grid railway-region-directory-grid">{RAILWAY_REGIONS.map((region) => {
        const count = companyDirectory.filter((company) => company.regions.includes(region)).length;
        return count > 0 ? <Link href={`/lines?region=${encodeURIComponent(region)}`} key={region}><b>{region}</b><span>{count}<small>社</small></span></Link> : null;
      })}{unassignedCompanies.length > 0 && <Link href={`/lines?region=${UNASSIGNED_REGION}`}><b>地域未登録</b><span>{unassignedCompanies.length}<small>社</small></span></Link>}</div>
    </section> : <div className="area-empty"><b>路線はまだ登録されていません</b><p>管理画面で路線と駅順を登録すると、ここに自動表示されます。</p></div>}
  </main></>;
}
