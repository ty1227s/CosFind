import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { areaHref, decodeAreaSegment, findPrefecture, getAreaDirectory, publicSiteOrigin } from "@/lib/area-directory";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ prefecture: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { prefecture: rawPrefecture } = await params;
  const prefectureName = decodeAreaSegment(rawPrefecture);
  const prefecture = findPrefecture(await getAreaDirectory(), prefectureName);
  if (!prefecture) return { title: "地域が見つかりません | CosFind", robots: { index: false, follow: false } };
  const title = `${prefecture.name}のコスメ取扱店舗を市区町村から探す | CosFind`;
  const description = `${prefecture.name}でコスメやスキンケアを取り扱う登録店舗${prefecture.storeCount}件を、市区町村別に探せます。ドラッグストアやバラエティショップなどの店舗情報を掲載しています。`;
  const url = `${publicSiteOrigin}${areaHref(prefecture.name)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}

export default async function PrefecturePage({ params }: PageProps) {
  const { prefecture: rawPrefecture } = await params;
  const prefectureName = decodeAreaSegment(rawPrefecture);
  const prefecture = findPrefecture(await getAreaDirectory(), prefectureName);
  if (!prefecture) notFound();

  return <><SiteHeader/><main className="area-directory-page">
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><Link href="/areas">市区町村から探す</Link><span>›</span><span>{prefecture.name}</span></nav>
    <header className="area-directory-hero compact">
      <p className="eyebrow">{prefecture.name.toUpperCase()} AREA</p>
      <h1>{prefecture.name}のコスメ取扱店舗</h1>
      <p>{prefecture.name}内の市区町村を選択すると、コスメ・スキンケアの取扱店舗を住所と店舗分類から探せます。</p>
      <dl><div><dt>登録店舗</dt><dd>{prefecture.storeCount}<small>件</small></dd></div><div><dt>掲載地域</dt><dd>{prefecture.municipalities.length}<small>市区町村</small></dd></div></dl>
    </header>
    <section className="area-municipality-section" aria-labelledby="municipality-heading">
      <h2 id="municipality-heading">市区町村を選択</h2>
      <div className="area-municipality-grid">{prefecture.municipalities.map((municipality) => <Link href={areaHref(prefecture.name, municipality.name)} key={municipality.name}>
        <b>{municipality.name}</b><span>{municipality.stores.length}<small>件</small></span>
      </Link>)}</div>
    </section>
  </main></>;
}

