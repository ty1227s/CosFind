import type { MetadataRoute } from "next";
import { areaHref, getAreaDirectory, getRailwayLineDirectory, getStationDirectory, publicSiteOrigin, railwayLineHref, stationHref } from "@/lib/area-directory";
import { getCatalogSitemapEntries } from "@/lib/server/catalog-seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [directory, stations, railwayLines, catalog] = await Promise.all([getAreaDirectory(), getStationDirectory(), getRailwayLineDirectory(), getCatalogSitemapEntries()]);
  const fixedPaths = ["", "/products", "/products/new", "/brands", "/areas", "/stations", "/lines", "/announcements"];
  const areaPaths = directory.flatMap((prefecture) => [
    areaHref(prefecture.name),
    ...prefecture.municipalities.map((municipality) => areaHref(prefecture.name, municipality.name)),
  ]);
  const storePaths = [...new Set(directory.flatMap((prefecture) => prefecture.municipalities.flatMap((municipality) => municipality.stores.map((store) => `/stores/${encodeURIComponent(store.id)}`))))];
  const stationPaths = stations.map((station) => stationHref(station.name));
  const railwayLinePaths = railwayLines.map((line) => railwayLineHref(line.name));
  const productEntries = catalog.products.map((product) => ({ url: `${publicSiteOrigin}/products/${encodeURIComponent(product.id)}`, changeFrequency: "weekly" as const, priority: .8 }));
  const brandEntries = catalog.brands.map((brandId) => ({ url: `${publicSiteOrigin}/brands/detail/${encodeURIComponent(brandId)}`, changeFrequency: "weekly" as const, priority: .7 }));
  return [
    ...fixedPaths.map((path) => ({ url: `${publicSiteOrigin}${path}`, changeFrequency: path === "" ? "daily" as const : "weekly" as const, priority: path === "" ? 1 : .8 })),
    ...areaPaths.map((path) => ({ url: `${publicSiteOrigin}${path}`, changeFrequency: "weekly" as const, priority: .7 })),
    ...stationPaths.map((path) => ({ url: `${publicSiteOrigin}${path}`, changeFrequency: "weekly" as const, priority: .7 })),
    ...railwayLinePaths.map((path) => ({ url: `${publicSiteOrigin}${path}`, changeFrequency: "weekly" as const, priority: .7 })),
    ...storePaths.map((path) => ({ url: `${publicSiteOrigin}${path}`, changeFrequency: "weekly" as const, priority: .6 })),
    ...brandEntries,
    ...productEntries,
  ];
}
