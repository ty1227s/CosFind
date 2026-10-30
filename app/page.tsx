import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
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

export default async function HomePage({ searchParams }: { searchParams: Promise<{ station?: string; stations?: string }> }) {
  const params = await searchParams;
  const station = params.station?.trim() || "";
  const stations = [...new Set((params.stations || station).split("|").map((name) => name.trim()).filter(Boolean))].slice(0, 8);
  if (station || stations.length) {
    const target = new URLSearchParams();
    if (station) target.set("station", station);
    if (stations.length) target.set("stations", stations.join("|"));
    permanentRedirect(`/map?${target.toString()}`);
  }
  return <CosFindApp initialStation={station} initialStations={stations} />;
}
