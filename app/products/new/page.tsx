export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import {loadPage} from "@/lib/server/mobile-pages/new-products";
import {NewProductsView} from "@/components/pages/new-products";
import { publicSiteOrigin } from "@/lib/area-links";
export const metadata: Metadata = {
 title:"新作コスメ発売日カレンダー | CosFind",
 description:"発売日別に新作コスメと新色を確認できます。",
 alternates:{canonical:`${publicSiteOrigin}/products/new`},
};
export default async function NewCosmeticsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }){return <NewProductsView model={await loadPage({ searchParams })} />;}
