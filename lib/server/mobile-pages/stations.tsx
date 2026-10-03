import "server-only";
import {getStationDirectory} from "@/lib/area-directory";
export async function loadPage(){
  const stations = await getStationDirectory();
  const storeCount = new Set(stations.flatMap((station) => station.stores.map((store) => store.id))).size;
  return {stations,storeCount};
}
