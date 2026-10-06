import { publicSiteOrigin } from "@/lib/area-links";
import { DIRECTORY_SITEMAP_PAGES, PRODUCT_SITEMAP_PAGE_SIZE, PRODUCT_SITEMAP_PAGES } from "@/lib/sitemap-config";
import { getActiveProductCount } from "@/lib/server/catalog-seo";
import { renderSitemapIndex, sitemapHeaders } from "@/lib/server/sitemap-xml";

export const dynamic = "force-dynamic";

export async function GET() {
  let productPages = PRODUCT_SITEMAP_PAGES;
  try {
    const productCount = await getActiveProductCount();
    productPages = Math.min(PRODUCT_SITEMAP_PAGES, Math.ceil(productCount / PRODUCT_SITEMAP_PAGE_SIZE));
  } catch {
    // 一時的にDBへ接続できない場合も、サイトマップ索引自体は返す。
  }
  const chunkCount = DIRECTORY_SITEMAP_PAGES + productPages;
  const urls = Array.from({ length: chunkCount }, (_, id) => `${publicSiteOrigin}/sitemaps/${id}.xml`);
  return new Response(renderSitemapIndex(urls), { headers: sitemapHeaders });
}
