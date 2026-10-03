import "server-only";
import {notFound} from "next/navigation";
import {decodeAreaSegment,findPrefecture,getAreaDirectory} from "@/lib/area-directory";
type PageProps = { params: Promise<{ prefecture: string }> };
export async function loadPage({ params }: PageProps){
  const { prefecture: rawPrefecture } = await params;
  const prefectureName = decodeAreaSegment(rawPrefecture);
  const prefecture = findPrefecture(await getAreaDirectory(), prefectureName);
  if (!prefecture) notFound();

  return {prefecture};
}
