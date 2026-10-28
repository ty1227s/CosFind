import type {Metadata} from "next";
import {decodeAreaSegment,getRailwayLineDirectory,publicSiteOrigin,railwayLineHref} from "@/lib/area-directory";
export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ line: string }> };
async function getLine(params: PageProps["params"]) {
  const lineName = decodeAreaSegment((await params).line);
  const line = (await getRailwayLineDirectory()).find((item) => item.name === lineName);
  return { lineName, line };
}
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lineName, line } = await getLine(params);
  if (!line) return { title: "路線が見つかりません | CosFind", robots: { index: false, follow: false } };
  const title = `${lineName}の駅一覧 | CosFind`;
  const description = `${lineName}に登録されている${line.stations.length}駅を路線順に掲載しています。駅名から周辺のコスメ・スキンケア取扱店舗を確認できます。`;
  const url = `${publicSiteOrigin}${railwayLineHref(lineName)}`;
  const storeCount = line.stations.reduce((total, station) => total + station.stores.length, 0);
  return { title, description, alternates: { canonical: url }, ...(storeCount ? {} : { robots: { index: false, follow: true } }), openGraph: { title, description, url, type: "website", ...(line.visualType==="image"&&line.imageUrl?{images:[line.imageUrl]}:{}) } };
}
import {loadPage} from "@/lib/server/mobile-pages/line";
import {LineView} from "@/components/pages/line";
export default async function RailwayLinePage({ params }: PageProps){return <LineView model={await loadPage({ params })} />;}
