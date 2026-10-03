import type {Metadata} from "next";
import {areaHref,decodeAreaSegment,findPrefecture,getAreaDirectory,publicSiteOrigin} from "@/lib/area-directory";
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
import {loadPage} from "@/lib/server/mobile-pages/prefecture";
import {PrefectureView} from "@/components/pages/prefecture";
export default async function PrefecturePage({ params }: PageProps){return <PrefectureView model={await loadPage({ params })} />;}
