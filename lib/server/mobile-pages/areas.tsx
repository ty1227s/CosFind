import "server-only";
import {getAreaDirectory} from "@/lib/area-directory";
export async function loadPage(){
  const source = await getAreaDirectory();
  const directory = source.map((prefecture) => ({ name: prefecture.name, storeCount: prefecture.storeCount, municipalityCount: prefecture.municipalities.length }));
  const storeCount = directory.reduce((total, prefecture) => total + prefecture.storeCount, 0);
  const municipalityCount = directory.reduce((total, prefecture) => total + prefecture.municipalityCount, 0);

  return {directory,storeCount,municipalityCount};
}
