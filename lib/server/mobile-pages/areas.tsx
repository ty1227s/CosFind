import "server-only";
import {getAreaDirectory} from "@/lib/area-directory";
export async function loadPage(){
  const directory = await getAreaDirectory();
  const storeCount = directory.reduce((total, prefecture) => total + prefecture.storeCount, 0);
  const municipalityCount = directory.reduce((total, prefecture) => total + prefecture.municipalities.length, 0);

  return {directory,storeCount,municipalityCount};
}
