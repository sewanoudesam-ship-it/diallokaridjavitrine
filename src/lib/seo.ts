import type { Metadata } from "next";

export function getConfiguredSiteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function pageMetadata({
  path,
  title,
  description,
  image,
  noindex = false,
}: {
  path: string;
  title: string;
  description: string;
  image?: string | null;
  noindex?: boolean;
}): Metadata {
  const origin = getConfiguredSiteOrigin();
  const absoluteUrl = origin ? new URL(path, origin).toString() : undefined;
  const images = image ? [{ url: image, alt: title }] : undefined;
  return {
    title,
    description,
    ...(absoluteUrl ? { alternates: { canonical: absoluteUrl } } : {}),
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "Maison Karidja",
      title,
      description,
      ...(absoluteUrl ? { url: absoluteUrl } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      ...(images ? { images: images.map((entry) => entry.url) } : {}),
    },
  };
}
