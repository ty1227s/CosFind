export const dynamic = "force-dynamic";
import {loadPage} from "@/lib/server/mobile-pages/product";
import {ProductView} from "@/components/pages/product";
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }){return <ProductView model={await loadPage({ params })} />;}
