import type { Metadata } from "next";
import { CosFindApp } from "@/components/cosfind-app";
import { publicSiteOrigin } from "@/lib/area-links";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "CosFind | 欲しいコスメ、どのお店にある？",
  description: "一般流通コスメの最近の在庫報告を地図で探せます。店舗ごとの報告日と確認された商品を確認できます。",
  alternates: { canonical: publicSiteOrigin },
  openGraph: {
    title: "CosFind | 欲しいコスメ、どのお店にある？",
    description: "一般流通コスメの最近の在庫報告を地図で探せます。",
    url: publicSiteOrigin,
    type: "website",
  },
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  const station = (await searchParams).station?.trim() || "";
  return <CosFindApp initialStation={station} />;
}
