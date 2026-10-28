import type { Metadata } from "next";
import { publicSiteOrigin } from "@/lib/area-links";
export const dynamic = "force-dynamic";
import {loadPage} from "@/lib/server/mobile-pages/announcements";
import {AnnouncementsView} from "@/components/pages/announcements";
type PageProps={searchParams:Promise<{page?:string}>};
export async function generateMetadata({searchParams}:PageProps):Promise<Metadata>{
 const raw=Number.parseInt((await searchParams).page||"1",10);const page=Number.isFinite(raw)&&raw>1?raw:1;
 const canonical=`${publicSiteOrigin}/announcements${page>1?`?page=${page}`:""}`;
 const title=`お知らせ${page>1?`（${page}ページ目）`:""} | CosFind`;const description="CosFindからの更新情報やご案内を掲載しています。";
 return{title,description,alternates:{canonical},openGraph:{title,description,url:canonical,type:"website"}};
}
export default async function Page({searchParams}:PageProps){return <AnnouncementsView model={await loadPage({searchParams})} />;}
