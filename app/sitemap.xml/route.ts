import { publicSiteOrigin } from "@/lib/area-links";
import { SITEMAP_CHUNK_COUNT } from "@/lib/sitemap-config";
import { renderSitemapIndex, sitemapHeaders } from "@/lib/server/sitemap-xml";

export const dynamic = "force-static";

export function GET() {
  const urls = Array.from({ length: SITEMAP_CHUNK_COUNT }, (_, id) => `${publicSiteOrigin}/sitemaps/${id}.xml`);
  return new Response(renderSitemapIndex(urls), { headers: sitemapHeaders });
}
