"use client";

import { useSearchParams } from "next/navigation";
import { ProductSearchPage } from "./product-search-page";

export function ProductSearchRoute() {
  const params = useSearchParams();
  return <ProductSearchPage initialBrand={params.get("brand") || ""} initialQuery={params.get("q") || ""}/>;
}
