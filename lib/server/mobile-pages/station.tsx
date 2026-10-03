import "server-only";
import {notFound} from "next/navigation";
import {decodeAreaSegment,getStationDirectory,publicSiteOrigin,stationHref} from "@/lib/area-directory";
import {formatStoreName} from "@/lib/store-name";
type PageProps = { params: Promise<{ station: string }> };
async function getStation(params: PageProps["params"]) {
  const stationName = decodeAreaSegment((await params).station);
  const station = (await getStationDirectory()).find((item) => item.name === stationName);
  return { stationName, station };
}
export async function loadPage({ params }: PageProps){
  const { stationName, station } = await getStation(params);
  if (!station) notFound();
  const pageUrl = `${publicSiteOrigin}${stationHref(stationName)}`;
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: publicSiteOrigin },
      { "@type": "ListItem", position: 2, name: "駅から探す", item: `${publicSiteOrigin}/stations` },
      { "@type": "ListItem", position: 3, name: stationName, item: pageUrl },
    ] },
    { "@type": "ItemList", name: `${stationName}周辺のコスメ取扱店舗`, numberOfItems: station.stores.length, itemListElement: station.stores.map((store, index) => ({
      "@type": "ListItem", position: index + 1, item: { "@type": "Store", name: formatStoreName(store), url: `${publicSiteOrigin}/stores/${encodeURIComponent(store.id)}`, address: store.address },
    })) },
  ] };
  return {stationName,station,jsonLd};
}
