export const dynamic = "force-dynamic";
import {loadPage} from "@/lib/server/mobile-pages/announcements";
import {AnnouncementsView} from "@/components/pages/announcements";
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){return <AnnouncementsView model={await loadPage({searchParams})} />;}
