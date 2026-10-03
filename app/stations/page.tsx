import type {Metadata} from "next";
import {publicSiteOrigin} from "@/lib/area-directory";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "駅からコスメ取扱店舗を探す | CosFind",
  description: "駅名別に、コスメ・スキンケアを取り扱うドラッグストア、バラエティショップ、スーパーなどの登録店舗を探せます。",
  alternates: { canonical: `${publicSiteOrigin}/stations` },
  openGraph: { title: "駅からコスメ取扱店舗を探す | CosFind", description: "駅名を選んで周辺のコスメ取扱店舗を確認できます。", url: `${publicSiteOrigin}/stations`, type: "website" },
};
import {loadPage} from "@/lib/server/mobile-pages/stations";
import {StationsView} from "@/components/pages/stations";
export default async function StationsPage(){return <StationsView model={await loadPage()} />;}
