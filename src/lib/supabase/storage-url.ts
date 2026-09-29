export function publicAssetUrl(path: string | null | undefined): string | null {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl || !path) return null;
  const segments = path.split("/").filter(Boolean).map((segment) => encodeURIComponent(segment));
  if (!segments.length) return null;
  const base = projectUrl.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/public-assets/${segments.join("/")}`;
}
