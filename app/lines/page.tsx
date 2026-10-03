import type { Metadata } from "next";


import { publicSiteOrigin } from "@/lib/area-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "路線からコスメ取扱店舗を探す | CosFind",
  description: "地域、鉄道会社、路線の順に駅をたどり、各駅周辺のコスメ・スキンケア取扱店舗を探せます。",
  alternates: { canonical: `${publicSiteOrigin}/lines` },
  openGraph: { title: "路線からコスメ取扱店舗を探す | CosFind", description: "地域と鉄道会社、路線、駅を選んで周辺のコスメ取扱店舗を確認できます。", url: `${publicSiteOrigin}/lines`, type: "website" },
};


import { loadPage } from "@/lib/server/mobile-pages/lines";
import { LinesView } from "@/components/pages/lines";

type PageProps = {
  searchParams: Promise<{ region?: string; company?: string }>;
};
export default async function RailwayLinesPage({ searchParams }: PageProps) {
  return <LinesView model={await loadPage({ searchParams })} />;
}
