import type { Metadata } from "next";
import { CosFindApp } from "@/components/cosfind-app";
import { publicSiteOrigin } from "@/lib/area-links";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "地図からコスメ取扱店舗を探す | CosFind",
  description: "現在地や駅周辺の地図から、コスメ・スキンケア取扱店舗を探せます。",
  alternates: { canonical: publicSiteOrigin },
  robots: { index: false, follow: true },
};

export default async function MapPage({ searchParams }: { searchParams: Promise<{ station?: string; stations?: string }> }) {
  const params = await searchParams;
  const station = params.station?.trim() || "";
  const stations = [...new Set((params.stations || station).split("|").map((name) => name.trim()).filter(Boolean))].slice(0, 8);
  return <CosFindApp initialStation={station} initialStations={stations} />;
}
