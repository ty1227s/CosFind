import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductSearchRoute } from "@/components/product-search-route";
import { publicSiteOrigin } from "@/lib/area-links";

export const metadata: Metadata = {
  title: "コスメ・スキンケア商品を検索 | CosFind",
  description: "ブランド名、商品名、カラーや色番から商品を検索し、最近見つかった店舗を確認できます。",
  alternates: { canonical: `${publicSiteOrigin}/products` },
};

export default function ProductsPage() {
  return <Suspense fallback={<main className="product-route-loading"><i/><span>商品検索を開いています…</span></main>}><ProductSearchRoute/></Suspense>;
}
