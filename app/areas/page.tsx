import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { areaHref, getAreaDirectory, publicSiteOrigin } from "@/lib/area-directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "市区町村からコスメ取扱店舗を探す | CosFind",
  description: "都道府県・市区町村別に、コスメやスキンケアを取り扱うドラッグストア、バラエティショップ、スーパーなどの登録店舗を探せます。",
  alternates: { canonical: `${publicSiteOrigin}/areas` },
  openGraph: {
    title: "市区町村からコスメ取扱店舗を探す | CosFind",
    description: "地域を選んで、コスメ取扱店舗の住所や店舗情報を確認できます。",
    url: `${publicSiteOrigin}/areas`,
    type: "website",
  },
};

export default async function AreasPage() {
  const directory = await getAreaDirectory();
  const storeCount = directory.reduce((total, prefecture) => total + prefecture.storeCount, 0);
  const municipalityCount = directory.reduce((total, prefecture) => total + prefecture.municipalities.length, 0);

  return <><SiteHeader/><main className="area-directory-page">
    <nav className="area-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span>›</span><span>市区町村から探す</span></nav>
    <header className="area-directory-hero">
      <p className="eyebrow">AREA DIRECTORY</p>
      <h1>市区町村からコスメ取扱店舗を探す</h1>
      <p>都道府県、市区町村の順に選ぶと、CosFindに登録されているコスメ・スキンケア取扱店舗を確認できます。</p>
      <dl><div><dt>登録店舗</dt><dd>{storeCount}<small>件</small></dd></div><div><dt>掲載地域</dt><dd>{municipalityCount}<small>市区町村</small></dd></div></dl>
    </header>
    {directory.length ? <section className="area-prefecture-section" aria-labelledby="prefecture-heading">
      <h2 id="prefecture-heading">都道府県を選択</h2>
      <div className="area-prefecture-grid">{directory.map((prefecture) => <Link href={areaHref(prefecture.name)} key={prefecture.name}>
        <span><b>{prefecture.name}</b><small>{prefecture.municipalities.length}市区町村</small></span><strong>{prefecture.storeCount}<small>件</small></strong>
      </Link>)}</div>
    </section> : <div className="area-empty"><b>掲載できる店舗がまだありません</b><p>登録店舗が公開されると、地域別に表示されます。</p></div>}
  </main></>;
}

