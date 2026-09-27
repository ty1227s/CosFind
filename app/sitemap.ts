import type { MetadataRoute } from "next";
import { areaHref, getAreaDirectory, publicSiteOrigin } from "@/lib/area-directory";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const directory = await getAreaDirectory();
  const fixedPaths = ["", "/products", "/products/new", "/brands", "/areas", "/announcements"];
  const areaPaths = directory.flatMap((prefecture) => [
    areaHref(prefecture.name),
    ...prefecture.municipalities.map((municipality) => areaHref(prefecture.name, municipality.name)),
  ]);
  const storePaths = [...new Set(directory.flatMap((prefecture) => prefecture.municipalities.flatMap((municipality) => municipality.stores.map((store) => `/stores/${encodeURIComponent(store.id)}`))))];
  return [
    ...fixedPaths.map((path) => ({ url: `${publicSiteOrigin}${path}`, changeFrequency: path === "" ? "daily" as const : "weekly" as const, priority: path === "" ? 1 : .8 })),
    ...areaPaths.map((path) => ({ url: `${publicSiteOrigin}${path}`, changeFrequency: "weekly" as const, priority: .7 })),
    ...storePaths.map((path) => ({ url: `${publicSiteOrigin}${path}`, changeFrequency: "weekly" as const, priority: .6 })),
  ];
}

