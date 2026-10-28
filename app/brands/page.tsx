import type { Metadata } from "next";
import { BrandIndex } from "./brand-index";
import { publicSiteOrigin } from "@/lib/area-links";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ブランドからコスメを探す | CosFind",
  description: "ブランド名の頭文字から、CosFindに登録されているコスメ・スキンケア商品を探せます。",
  alternates: { canonical: `${publicSiteOrigin}/brands` },
};

export default function BrandsPage() {
  return <BrandIndex />;
}
