import type {Metadata} from "next";
import {publicSiteOrigin} from "@/lib/area-directory";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "市区町村からコスメ取扱店舗を探す | CosFind",
  description: "都道府県・市区町村別に、コスメやスキンケアを取り扱うドラッグストア、バラエティショップ、スーパーなどの登録店舗を探せます。",
  alternates: { canonical: `${publicSiteOrigin}/areas` },
  openGraph: {
    title: "市区町村からコスメ取扱店舗を探す | CosFind",
    description: "地域を選んで、コスメ取扱店舗の住所や店舗情報を確認できます。",
    url: `${publicSiteOrigin}/areas`,
    type: "website",
  },
};
import {loadPage} from "@/lib/server/mobile-pages/areas";
import {AreasView} from "@/components/pages/areas";
export default async function AreasPage(){return <AreasView model={await loadPage()} />;}
