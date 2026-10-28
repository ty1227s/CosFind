import type { Metadata } from "next";


import { publicSiteOrigin } from "@/lib/area-links";

export const dynamic = "force-dynamic";

import { loadPage } from "@/lib/server/mobile-pages/lines";
import { LinesView } from "@/components/pages/lines";

type PageProps = {
  searchParams: Promise<{ region?: string; company?: string }>;
};
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const values = await searchParams;
  const region = values.region?.trim() || "";
  const company = values.company?.trim() || "";
  const params = new URLSearchParams();
  if (region) params.set("region", region);
  if (company) params.set("company", company);
  const canonical = `${publicSiteOrigin}/lines${params.size ? `?${params.toString()}` : ""}`;
  const subject = company || region;
  const title = subject ? `${subject}の駅・路線からコスメ取扱店舗を探す | CosFind` : "駅・路線からコスメ取扱店舗を探す | CosFind";
  const description = subject
    ? `${subject}の路線と駅をたどり、駅周辺のコスメ・スキンケア取扱店舗を探せます。`
    : "地域、鉄道会社、路線の順に駅をたどり、各駅周辺のコスメ・スキンケア取扱店舗を探せます。";
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: "website" } };
}
export default async function RailwayLinesPage({ searchParams }: PageProps) {
  return <LinesView model={await loadPage({ searchParams })} />;
}
