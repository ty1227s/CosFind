import "server-only";
import {notFound} from "next/navigation";
import {decodeAreaSegment,getStationDirectory,publicSiteOrigin,resolveStationPage,stationHref} from "@/lib/area-directory";
import {formatStoreName} from "@/lib/store-name";
type PageProps = { params: Promise<{ station: string }> };
async function getStation(params: PageProps["params"]) {
  const stationName = decodeAreaSegment((await params).station);
  const resolved = resolveStationPage(await getStationDirectory(), stationName);
  return { stationName, resolved };
}
export async function loadPage({ params }: PageProps){
  const { stationName: requestedStationName, resolved } = await getStation(params);
  if (!resolved) notFound();
  const { canonicalName, displayName: stationName, memberNames, station } = resolved;
  const pageUrl = `${publicSiteOrigin}${stationHref(canonicalName)}`;
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: publicSiteOrigin },
      { "@type": "ListItem", position: 2, name: "駅・路線から探す", item: `${publicSiteOrigin}/lines` },
      { "@type": "ListItem", position: 3, name: stationName, item: pageUrl },
    ] },
    { "@type": "ItemList", name: `${stationName}周辺のコスメ取扱店舗`, numberOfItems: station.stores.length, itemListElement: station.stores.map((store, index) => ({
      "@type": "ListItem", position: index + 1, item: { "@type": "Store", name: formatStoreName(store), url: `${publicSiteOrigin}/stores/${encodeURIComponent(store.id)}`, address: store.address },
    })) },
  ] };
  return {requestedStationName,canonicalName,stationName,memberNames,station,jsonLd};
}
