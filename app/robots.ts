import type { MetadataRoute } from "next";
import { publicSiteOrigin } from "@/lib/area-directory";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/profile/", "/report", "/requests/", "/login", "/reset-password"] },
    sitemap: `${publicSiteOrigin}/sitemap.xml`,
  };
}

