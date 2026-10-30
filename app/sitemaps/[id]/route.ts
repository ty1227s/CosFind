import { areaHref, getDirectorySitemapEntries, publicSiteOrigin, railwayLineHref, stationHref } from "@/lib/area-directory";
import { DIRECTORY_SITEMAP_PAGES, PRODUCT_SITEMAP_PAGE_SIZE, SITEMAP_CHUNK_COUNT } from "@/lib/sitemap-config";
import { getCatalogSitemapPage } from "@/lib/server/catalog-seo";
import { renderSitemap, sitemapHeaders, type SitemapEntry } from "@/lib/server/sitemap-xml";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const rawId = (await params).id.replace(/\.xml$/i, "");
  const sitemapId = Number(rawId);
  if (!Number.isInteger(sitemapId) || sitemapId < 0 || sitemapId >= SITEMAP_CHUNK_COUNT) return new Response("Not found", { status: 404 });

  let entries: SitemapEntry[];
  if (sitemapId >= DIRECTORY_SITEMAP_PAGES) {
    const catalog = await getCatalogSitemapPage(sitemapId - DIRECTORY_SITEMAP_PAGES, PRODUCT_SITEMAP_PAGE_SIZE);
    entries = catalog.products.map((product) => ({ url: `${publicSiteOrigin}/products/${encodeURIComponent(product.id)}`, lastModified: product.createdAt, changeFrequency: "weekly", priority: .8 }));
  } else {
    const directory = await getDirectorySitemapEntries();
    const prefectures = directory ? [...new Set(directory.areas.map((area) => area.prefecture))] : [];
    const fixedPaths = ["", "/products", "/products/new", "/brands", "/areas", "/stations", "/lines", "/announcements"];
    if (sitemapId === 0 && directory) entries = [
      ...fixedPaths.map((path): SitemapEntry => ({ url: `${publicSiteOrigin}${path}`, changeFrequency: path === "" ? "daily" : "weekly", priority: path === "" ? 1 : .8 })),
      ...prefectures.map((prefecture): SitemapEntry => ({ url: `${publicSiteOrigin}${areaHref(prefecture)}`, changeFrequency: "weekly", priority: .7 })),
      ...directory.areas.map((area): SitemapEntry => ({ url: `${publicSiteOrigin}${areaHref(area.prefecture, area.municipality)}`, changeFrequency: "weekly", priority: .7 })),
    ];
    else if (sitemapId === 1 && directory) entries = directory.stationNames.map((name): SitemapEntry => ({ url: `${publicSiteOrigin}${stationHref(name)}`, changeFrequency: "weekly", priority: .7 }));
    else if (sitemapId === 2 && directory) entries = directory.lineNames.map((name): SitemapEntry => ({ url: `${publicSiteOrigin}${railwayLineHref(name)}`, changeFrequency: "weekly", priority: .7 }));
    else if (sitemapId === 3 && directory) entries = directory.stores.map((store): SitemapEntry => ({ url: `${publicSiteOrigin}/stores/${encodeURIComponent(store.id)}`, lastModified: store.createdAt, changeFrequency: "weekly", priority: .6 }));
    else {
      const catalog = await getCatalogSitemapPage(0, 1, true);
      entries = catalog.brands.map((brand): SitemapEntry => ({ url: `${publicSiteOrigin}/brands/detail/${encodeURIComponent(brand.id)}`, lastModified: brand.createdAt, changeFrequency: "weekly", priority: .7 }));
    }
  }
  return new Response(renderSitemap(entries), { headers: sitemapHeaders });
}
