import {loadPage} from "@/lib/server/mobile-pages/brands";
import {BrandsView} from "@/components/pages/brands";
export async function BrandIndex({ requested = "" }: { requested?: string }){return <BrandsView model={await loadPage({ requested })} />;}
