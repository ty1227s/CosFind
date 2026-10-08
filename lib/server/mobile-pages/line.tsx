import "server-only";
import {notFound} from "next/navigation";
import {decodeAreaSegment,getRailwayLineDirectory,publicSiteOrigin,railwayLineHref,stationHref} from "@/lib/area-directory";
type PageProps = { params: Promise<{ line: string }> };
async function getLine(params: PageProps["params"]) {
  const lineName = decodeAreaSegment((await params).line);
  const line = (await getRailwayLineDirectory()).find((item) => item.name === lineName);
  return { lineName, line };
}
export async function loadPage({ params }: PageProps){
  const { lineName, line } = await getLine(params);
  if (!line) notFound();
  const pageUrl = `${publicSiteOrigin}${railwayLineHref(lineName)}`;
  const jsonLd = { "@context":"https://schema.org", "@graph":[
    { "@type":"BreadcrumbList", itemListElement:[
      { "@type":"ListItem", position:1, name:"ホーム", item:publicSiteOrigin },
      { "@type":"ListItem", position:2, name:"駅・路線から探す", item:`${publicSiteOrigin}/lines` },
      { "@type":"ListItem", position:3, name:lineName, item:pageUrl },
    ]},
    { "@type":"ItemList", name:`${lineName}の登録駅`, numberOfItems:line.stations.length, itemListElement:line.stations.map((station,index)=>({"@type":"ListItem",position:index+1,name:station.name,url:`${publicSiteOrigin}${stationHref(station.name)}`})) },
  ]};
  return {lineName,line:{name:line.name,companies:line.companies,visualType:line.visualType,imageUrl:line.imageUrl,lineColor:line.lineColor,stations:line.stations.map((station)=>({name:station.name,storeCount:station.stores.length}))},jsonLd};
}
