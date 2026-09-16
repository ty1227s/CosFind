import { Suspense } from "react";
import { ProductSearchRoute } from "@/components/product-search-route";

export default function ProductsPage() {
  return <Suspense fallback={<main className="product-route-loading"><i/><span>商品検索を開いています…</span></main>}><ProductSearchRoute/></Suspense>;
}
