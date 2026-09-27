import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { areaHref, decodeAreaSegment, findMunicipality, findPrefecture, getAreaDirectory, publicSiteOrigin } from "@/lib/area-directory";
import { formatStoreName } from "@/lib/store-name";
import { getStoreTypeCode } from "@/lib/store-type-code";
import { getStoreTypeColor } from "@/lib/store-type-color";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ prefecture: string; municipality: string }> };

async function getArea(params: PageProps["params"]) {
  const values = await params;
  const prefectureName = decodeAreaSegment(values.prefecture);
  const municipalityName = decodeAreaSegment(values.municipality);
  const prefecture = findPrefecture(await getAreaDirectory(), prefectureName);
  const municipality = prefecture ? findMunicipality(prefecture, municipalityName) : undefined;
  return { prefecture, municipality, prefectureName, municipalityName };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { prefecture, municipality, prefectureName, municipalityName } = await getArea(params);
  if (!prefecture || !municipality) return { title: "地域が見つかりません | CosFind", robots: { index: false, follow: false } };
  const areaName = `${prefectureName}${municipalityName}`;
  const title = `${areaName}のコスメ取扱店舗一覧 | CosFind`;
  const description = `${areaName}でコスメ・スキンケアを取り扱う登録店舗${municipality.stores.length}件を掲載。ドラッグストア、バラエティショップ、スーパーなどの住所と店舗情報を確認できます。`;
  const url = `${publicSiteOrigin}${areaHref(prefectureName, municipalityName)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}

export default async function MunicipalityPage({ params }: PageProps) {
  const { prefecture, municipality, prefectureName, municipalityName } = await getArea(params);
  if (!prefecture || !municipality) notFound();
  const areaName = `${prefectureName}${municipalityName}`;
  const pageUrl = `${publicSiteOrigin}${areaHref(prefectureName, municipalityName)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: publicSiteOrigin },
        { "@type": "ListItem", position: 2, name: "市区町村から探す", item: `${publicSiteOrigin}/areas` },
        { "@type": "ListItem", position: 3, name: prefectureName, item: `${publicSiteOrigin}${areaHref(prefectureName)}` },
        { "@type": "ListItem", position: 4, name: municipalityName, item: pageUrl },
      ] },
      { "@type": "ItemList", name: `${areaName}のコスメ取扱店舗`, numberOfItems: municipality.stores.length, itemListElement: municipality.stores.map((store, index) => ({
        "@type": "ListItem", position: index + 1, url: `${publicSiteOrigin}/stores/${encodeURIComponent(store.id)}`, name: formatStoreName(store),
      })) },
    ],
  };

  return <><SiteHeader/><main className="area-directory-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><Link href="/areas">市区町村から探す</Link><span>›</span><Link href={areaHref(prefectureName)}>{prefectureName}</Link><span>›</span><span>{municipalityName}</span></nav>
    <header className="area-directory-hero compact">
      <p className="eyebrow">LOCAL STORE GUIDE</p>
      <h1>{areaName}のコスメ取扱店舗</h1>
      <p>{areaName}でコスメやスキンケアを取り扱う、CosFind登録店舗の一覧です。店舗名、店舗分類、住所から目的のお店を探せます。</p>
      <dl><div><dt>登録店舗</dt><dd>{municipality.stores.length}<small>件</small></dd></div></dl>
    </header>
    <section className="area-store-section" aria-labelledby="store-heading">
      <div className="area-section-heading"><div><h2 id="store-heading">{municipalityName}の登録店舗</h2><p>各店舗の詳細ページで、最近報告された商品や取扱ブランドを確認できます。</p></div><Link href="/">地図から探す</Link></div>
      <div className="area-store-list">{municipality.stores.map((store) => {
        const displayName = formatStoreName(store);
        const color = getStoreTypeColor(store.type);
        return <article key={store.id}>
          <div className="area-store-code" style={{ backgroundColor: color.background, color: color.foreground }}>{getStoreTypeCode(store.type)}</div>
          <div><p>{store.type}</p><h2><Link href={`/stores/${encodeURIComponent(store.id)}`}>{displayName}</Link></h2><address>{store.address}</address></div>
          <Link className="area-store-detail-link" href={`/stores/${encodeURIComponent(store.id)}`} aria-label={`${displayName}の詳細を見る`}>詳細を見る <span>→</span></Link>
        </article>;
      })}</div>
    </section>
    <aside className="area-information-note"><h2>在庫情報について</h2><p>CosFindはリアルタイムの在庫数を保証するサービスではありません。店舗詳細で情報提供日を確認し、来店時の目安としてご利用ください。</p></aside>
  </main></>;
}

