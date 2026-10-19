import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { railwayLineHref } from "@/lib/area-links";
import { RAILWAY_REGIONS } from "@/lib/railway-regions";
import type { loadPage } from "@/lib/server/mobile-pages/lines";

const UNASSIGNED_REGION = "__unassigned_region__";
const UNASSIGNED_COMPANY = "__unassigned__";
type Model = Awaited<ReturnType<typeof loadPage>>;

export function LinesView({ model }: { model: Model }) {
  const {
    lines, companyDirectory, unassignedCompanies,
    selectedRegion, companiesInRegion, unassignedLines,
    selectedCompany, visibleLines, selectedCompanyLabel,
    selectedRegionLabel
  } = model;
  return <><SiteHeader/><main className="area-directory-page">
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><span>駅・路線から探す</span></nav>
    <header className="area-directory-hero">
      <p className="eyebrow">RAILWAY LINE DIRECTORY</p>
      <h1>駅・路線からコスメ取扱店舗を探す</h1>
      <p>地域、鉄道会社、路線の順に選ぶと、登録順に並んだ駅と、沿線のコスメ・スキンケア取扱店舗を確認できます。</p>
    </header>
    {lines.length ? selectedCompany ? <section className="area-municipality-section" aria-labelledby="line-heading">
      <div className="area-section-heading"><div><p className="directory-step-label">地域：{selectedRegionLabel || "指定なし"}</p><h2 id="line-heading">{selectedCompanyLabel}の路線</h2><p>路線を選ぶと登録駅を確認できます。</p></div><Link href={selectedRegion ? `/lines?region=${encodeURIComponent(selectedRegion)}` : "/lines"}>← 鉄道会社一覧へ戻る</Link></div>
      {visibleLines.length ? <div className="area-municipality-grid railway-line-directory-grid">{visibleLines.map((line) => <Link href={railwayLineHref(line.name)} key={line.name}>
        <span className="railway-line-card-name">{line.visualType==="image"&&line.imageUrl?<img src={line.imageUrl} alt=""/>:line.lineColor?<i className="railway-line-color-mark" style={{backgroundColor:line.lineColor}}/>:null}<b>{line.name}</b></span><span>{line.stationCount}<small>駅</small></span>
      </Link>)}</div> : <div className="area-empty"><b>この地域を通る登録路線はありません</b><p>路線に登録された駅の都道府県をもとに表示しています。</p></div>}
    </section> : selectedRegion ? <section className="area-municipality-section" aria-labelledby="company-heading">
      <div className="area-section-heading"><div><h2 id="company-heading">{selectedRegionLabel}の鉄道会社</h2><p>鉄道会社を選ぶと登録路線を確認できます。</p></div><Link href="/lines">← 地域一覧へ戻る</Link></div>
      <div className="area-municipality-grid railway-company-directory-grid">{companiesInRegion.map((company) => <Link href={`/lines?region=${encodeURIComponent(selectedRegion)}&company=${encodeURIComponent(company.name)}`} key={company.name}><b>{company.name}</b><span>{company.lineCount}<small>路線</small></span></Link>)}{selectedRegion === UNASSIGNED_REGION && unassignedLines.length > 0 && <Link href={`/lines?region=${UNASSIGNED_REGION}&company=${UNASSIGNED_COMPANY}`}><b>鉄道会社未登録</b><span>{unassignedLines.length}<small>路線</small></span></Link>}</div>
    </section> : <section className="area-municipality-section" aria-labelledby="region-heading">
      <h2 id="region-heading">地域を選択</h2>
      <p className="directory-step-description">地域を選ぶと、その地域で運行している鉄道会社を表示します。</p>
      <div className="area-municipality-grid railway-region-directory-grid">{RAILWAY_REGIONS.map((region) => {
        const count = companyDirectory.filter((company) => company.regions.includes(region)).length;
        return count > 0 ? <Link href={`/lines?region=${encodeURIComponent(region)}`} key={region}><b>{region}</b></Link> : null;
      })}{unassignedCompanies.length > 0 && <Link href={`/lines?region=${UNASSIGNED_REGION}`}><b>地域未登録</b></Link>}</div>
    </section> : <div className="area-empty"><b>路線はまだ登録されていません</b><p>管理画面で路線と駅順を登録すると、ここに自動表示されます。</p></div>}
  </main></>;
}

