import "server-only";
import {getStationDirectory} from "@/lib/area-directory";
const PAGE_SIZE=60;
type PageProps={searchParams:Promise<{page?:string}>};
export async function loadPage({searchParams}:PageProps){
  const params=await searchParams;
  const directory = await getStationDirectory();
  const storeIds = new Set<string>();
  const summaries = directory.map((station) => {
    for (const store of station.stores) storeIds.add(store.id);
    return { name: station.name, prefecture: station.prefecture, municipality: station.municipality, lineNames: station.lineNames, storeCount: station.stores.length };
  });
  const pageCount=Math.max(1,Math.ceil(summaries.length/PAGE_SIZE));
  const requestedPage=Number.parseInt(params.page??"1",10);
  const page=Number.isFinite(requestedPage)?Math.min(Math.max(requestedPage,1),pageCount):1;
  const stations=summaries.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const storeCount = storeIds.size;
  return {stations,storeCount,stationCount:summaries.length,page,pageCount};
}
