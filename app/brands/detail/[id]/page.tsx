export const dynamic = "force-dynamic";
import {loadPage} from "@/lib/server/mobile-pages/brand";
import {BrandView} from "@/components/pages/brand";
export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }){return <BrandView model={await loadPage({ params })} />;}
