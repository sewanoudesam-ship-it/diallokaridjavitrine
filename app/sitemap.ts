import type { MetadataRoute } from "next";
import { getPublishedBook, listPublishedProducts } from "@/src/lib/data/public";
import { getConfiguredSiteOrigin } from "@/src/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getConfiguredSiteOrigin();
  if (!origin) return [];
  const [book, products] = await Promise.all([getPublishedBook(), listPublishedProducts()]);
  const paths = ["/", "/boutique", "/a-propos", "/contact"];
  if (book.data) paths.push("/livre");
  const entries: MetadataRoute.Sitemap = paths.map((path) => ({ url: new URL(path, origin).toString() }));
  if (!products.unavailable) {
    for (const product of products.data) {
      entries.push({ url: new URL(`/boutique/${encodeURIComponent(product.slug)}`, origin).toString() });
    }
  }
  return entries;
}
