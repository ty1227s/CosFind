import type {Metadata} from "next";
import {areaHref,decodeAreaSegment,findMunicipality,findPrefecture,getAreaDirectory,publicSiteOrigin} from "@/lib/area-directory";
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
  const stations = [...new Set(municipality.stores.flatMap((store) => store.stationNames))].slice(0, 6);
  const title = `${areaName}のコスメ取扱店舗一覧 | CosFind`;
  const stationText = stations.length ? `${stations.join("・")}周辺を含む、` : "";
  const description = `${areaName}で${stationText}コスメ・スキンケアを取り扱う登録店舗${municipality.stores.length}件を掲載。店舗名、住所、最寄り駅から探せます。`;
  const url = `${publicSiteOrigin}${areaHref(prefectureName, municipalityName)}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}
import {loadPage} from "@/lib/server/mobile-pages/municipality";
import {MunicipalityView} from "@/components/pages/municipality";
export default async function MunicipalityPage({ params }: PageProps){return <MunicipalityView model={await loadPage({ params })} />;}
