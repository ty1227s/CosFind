export const dynamic = "force-dynamic";
import {loadPage} from "@/lib/server/mobile-pages/new-products";
import {NewProductsView} from "@/components/pages/new-products";
export default async function NewCosmeticsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }){return <NewProductsView model={await loadPage({ searchParams })} />;}
