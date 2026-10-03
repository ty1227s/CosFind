import "server-only";
import {notFound} from "next/navigation";
import {areaHref,decodeAreaSegment,findMunicipality,findPrefecture,getAreaDirectory,publicSiteOrigin} from "@/lib/area-directory";
import {formatStoreName} from "@/lib/store-name";
type PageProps = { params: Promise<{ prefecture: string; municipality: string }> };
async function getArea(params: PageProps["params"]) {
  const values = await params;
  const prefectureName = decodeAreaSegment(values.prefecture);
  const municipalityName = decodeAreaSegment(values.municipality);
  const prefecture = findPrefecture(await getAreaDirectory(), prefectureName);
  const municipality = prefecture ? findMunicipality(prefecture, municipalityName) : undefined;
  return { prefecture, municipality, prefectureName, municipalityName };
}
export async function loadPage({ params }: PageProps){
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
        "@type": "ListItem", position: index + 1, item: { "@type": "Store", url: `${publicSiteOrigin}/stores/${encodeURIComponent(store.id)}`, name: formatStoreName(store), address: store.address, keywords: store.stationNames.join(", ") },
      })) },
    ],
  };

  return {municipality,prefectureName,municipalityName,areaName,jsonLd};
}
