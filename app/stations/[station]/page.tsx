import type {Metadata} from "next";
import {decodeAreaSegment,getStationDirectory,publicSiteOrigin,stationHref} from "@/lib/area-directory";
export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ station: string }> };
async function getStation(params: PageProps["params"]) {
  const stationName = decodeAreaSegment((await params).station);
  const station = (await getStationDirectory()).find((item) => item.name === stationName);
  return { stationName, station };
}
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { stationName, station } = await getStation(params);
  if (!station) return { title: "駅が見つかりません | CosFind", robots: { index: false, follow: false } };
  const title = `${stationName}周辺のコスメ取扱店舗一覧 | CosFind`;
  const lineText = station.lineNames.length ? `${station.lineNames.join("、")}沿線の` : "";
  const description = `${stationName}周辺で${lineText}コスメ・スキンケアを取り扱う登録店舗${station.stores.length}件を掲載。店舗名、住所、店舗分類、最近の報告情報を確認できます。`;
  const url = `${publicSiteOrigin}${stationHref(stationName)}`;
  return { title, description, alternates: { canonical: url }, ...(station.stores.length ? {} : { robots: { index: false, follow: true } }), openGraph: { title, description, url, type: "website" } };
}
import {loadPage} from "@/lib/server/mobile-pages/station";
import {StationView} from "@/components/pages/station";
export default async function StationPage({ params }: PageProps){return <StationView model={await loadPage({ params })} />;}
