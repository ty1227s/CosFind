export const dynamic = "force-dynamic";
import {loadPage} from "@/lib/server/mobile-pages/announcement";
import {AnnouncementView} from "@/components/pages/announcement";
export default async function Page({ params }: { params: Promise<{ id: string }> }){return <AnnouncementView model={await loadPage({ params })} />;}
