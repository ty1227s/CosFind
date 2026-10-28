import "server-only";
import {notFound} from "next/navigation";
import {decodeAreaSegment,getRailwayLineDirectory,getStationDirectory,publicSiteOrigin,railwayLineHref,resolveStationPage,stationHref} from "@/lib/area-directory";
type PageProps = { params: Promise<{ line: string }> };
async function getLine(params: PageProps["params"]) {
  const lineName = decodeAreaSegment((await params).line);
  const line = (await getRailwayLineDirectory()).find((item) => item.name === lineName);
  return { lineName, line };
}
export async function loadPage({ params }: PageProps){
  const { lineName, line } = await getLine(params);
  if (!line) notFound();
  const stationDirectory=await getStationDirectory();
  const stationModels=line.stations.map((station)=>{const resolved=resolveStationPage(stationDirectory,station.name);return{name:station.name,hrefName:resolved?.canonicalName??station.name,storeCount:resolved?.station.stores.length??station.stores.length}});
  const pageUrl = `${publicSiteOrigin}${railwayLineHref(lineName)}`;
  const companyName = line.companies.join(" / ");
  const companyUrl = line.companies[0] ? `${publicSiteOrigin}/lines?company=${encodeURIComponent(line.companies[0])}` : "";
  const lineBreadcrumbPosition = line.companies.length > 0 ? 4 : 3;
  const jsonLd = { "@context":"https://schema.org", "@graph":[
    { "@type":"BreadcrumbList", itemListElement:[
      { "@type":"ListItem", position:1, name:"ホーム", item:publicSiteOrigin },
      { "@type":"ListItem", position:2, name:"駅・路線から探す", item:`${publicSiteOrigin}/lines` },
      ...(companyName ? [{ "@type":"ListItem", position:3, name:companyName, item:companyUrl }] : []),
      { "@type":"ListItem", position:lineBreadcrumbPosition, name:lineName, item:pageUrl },
    ]},
    { "@type":"ItemList", name:`${lineName}の登録駅`, numberOfItems:stationModels.length, itemListElement:stationModels.map((station,index)=>({"@type":"ListItem",position:index+1,name:station.name,url:`${publicSiteOrigin}${stationHref(station.hrefName)}`})) },
  ]};
  return {lineName,line:{name:line.name,companies:line.companies,visualType:line.visualType,imageUrl:line.imageUrl,lineColor:line.lineColor,stations:stationModels},jsonLd};
}
