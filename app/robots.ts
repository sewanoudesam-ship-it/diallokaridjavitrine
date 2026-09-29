import type { MetadataRoute } from "next";
import { getConfiguredSiteOrigin } from "@/src/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const origin = getConfiguredSiteOrigin();
  if (!origin) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/admin/", "/telechargement", "/telechargement/", "/api/"] },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
