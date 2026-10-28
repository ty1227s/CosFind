import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {decodeAreaSegment,getStationDirectory,publicSiteOrigin,resolveStationPage,stationHref} from "@/lib/area-directory";
export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ station: string }> };
async function getStation(params: PageProps["params"]) {
  const stationName = decodeAreaSegment((await params).station);
  const resolved = resolveStationPage(await getStationDirectory(), stationName);
  return { stationName, resolved };
}
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { resolved } = await getStation(params);
  if (!resolved) return { title: "駅が見つかりません | CosFind", robots: { index: false, follow: false } };
  const {displayName:stationName,canonicalName,station}=resolved;
  const title = `${stationName}周辺のコスメ取扱店舗一覧 | CosFind`;
  const lineText = station.lineNames.length ? `${station.lineNames.join("、")}沿線の` : "";
  const description = `${stationName}周辺で${lineText}コスメ・スキンケアを取り扱う登録店舗${station.stores.length}件を掲載。店舗名、住所、店舗分類、最近の報告情報を確認できます。`;
  const url = `${publicSiteOrigin}${stationHref(canonicalName)}`;
  return { title, description, alternates: { canonical: url }, ...(station.stores.length ? {} : { robots: { index: false, follow: true } }), openGraph: { title, description, url, type: "website" } };
}
import {loadPage} from "@/lib/server/mobile-pages/station";
import {StationView} from "@/components/pages/station";
export default async function StationPage({ params }: PageProps){const model=await loadPage({params});if(model.requestedStationName!==model.canonicalName)redirect(stationHref(model.canonicalName));return <StationView model={model}/>;}
