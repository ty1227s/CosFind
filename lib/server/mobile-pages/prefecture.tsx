import "server-only";
import {notFound} from "next/navigation";
import {decodeAreaSegment,findPrefecture,getAreaDirectory} from "@/lib/area-directory";
type PageProps = { params: Promise<{ prefecture: string }> };
export async function loadPage({ params }: PageProps){
  const { prefecture: rawPrefecture } = await params;
  const prefectureName = decodeAreaSegment(rawPrefecture);
  const source = findPrefecture(await getAreaDirectory(), prefectureName);
  if (!source) notFound();
  const prefecture = { name: source.name, storeCount: source.storeCount, municipalities: source.municipalities.map((municipality) => ({ name: municipality.name, storeCount: municipality.stores.length })) };

  return {prefecture};
}
