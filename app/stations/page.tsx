import type {Metadata} from "next";
import {publicSiteOrigin} from "@/lib/area-directory";
export const dynamic = "force-dynamic";
import {loadPage} from "@/lib/server/mobile-pages/stations";
import {StationsView} from "@/components/pages/stations";
type PageProps={searchParams:Promise<{page?:string}>};
export async function generateMetadata({searchParams}:PageProps):Promise<Metadata>{
 const raw=Number.parseInt((await searchParams).page||"1",10);const page=Number.isFinite(raw)&&raw>1?raw:1;
 const canonical=`${publicSiteOrigin}/stations${page>1?`?page=${page}`:""}`;
 const title=`駅からコスメ取扱店舗を探す${page>1?`（${page}ページ目）`:""} | CosFind`;
 const description="駅名別に、コスメ・スキンケアを取り扱うドラッグストア、バラエティショップ、スーパーなどの登録店舗を探せます。";
 return{title,description,alternates:{canonical},openGraph:{title,description,url:canonical,type:"website"}};
}
export default async function StationsPage({searchParams}:PageProps){return <StationsView model={await loadPage({searchParams})} />;}
