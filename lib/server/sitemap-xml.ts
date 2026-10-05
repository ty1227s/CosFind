import "server-only";

export type SitemapEntry = { url: string; changeFrequency: "daily" | "weekly"; priority: number };

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}

export function renderSitemap(entries: SitemapEntry[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((entry) => `<url><loc>${escapeXml(entry.url)}</loc><changefreq>${entry.changeFrequency}</changefreq><priority>${entry.priority}</priority></url>`).join("\n")}\n</urlset>`;
}

export function renderSitemapIndex(urls: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join("\n")}\n</sitemapindex>`;
}

export const sitemapHeaders = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400" };
