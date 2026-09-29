import { getPublicSupabaseClient } from "@/src/lib/supabase/public";
import { publicAssetUrl } from "@/src/lib/supabase/storage-url";
import type { PublicProduct, PublishedBook, PublicSiteSettings } from "@/src/lib/types";

export interface DataResult<T> { configured: boolean; unavailable: boolean; data: T }

type ProductViewRow = Omit<PublicProduct, "image_url"> & { image_path: string | null };
type BookViewRow = Omit<PublishedBook, "cover_url"> & { cover_path: string | null };

export async function listPublishedProducts(): Promise<DataResult<PublicProduct[]>> {
  const client = getPublicSupabaseClient();
  if (!client) return { configured: false, unavailable: false, data: [] };
  const { data, error } = await client
    .from("published_products")
    .select("id,name,slug,reference,description,price_amount,currency,category,availability,status,image_path")
    .order("name", { ascending: true });
  if (error) return { configured: true, unavailable: true, data: [] };
  const rows = (data ?? []) as unknown as ProductViewRow[];
  return {
    configured: true,
    unavailable: false,
    data: rows.map(({ image_path, ...product }) => ({ ...product, image_url: publicAssetUrl(image_path) })),
  };
}

export async function getPublishedProduct(slug: string): Promise<DataResult<PublicProduct | null>> {
  const client = getPublicSupabaseClient();
  if (!client) return { configured: false, unavailable: false, data: null };
  const { data, error } = await client
    .from("published_products")
    .select("id,name,slug,reference,description,price_amount,currency,category,availability,status,image_path")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return { configured: true, unavailable: true, data: null };
  if (!data) return { configured: true, unavailable: false, data: null };
  const { image_path, ...product } = data as unknown as ProductViewRow;
  return { configured: true, unavailable: false, data: { ...product, image_url: publicAssetUrl(image_path) } };
}

export async function getPublishedBook(): Promise<DataResult<PublishedBook | null>> {
  const client = getPublicSupabaseClient();
  if (!client) return { configured: false, unavailable: false, data: null };
  const { data, error } = await client
    .from("published_books")
    .select("id,title,author,slug,description,price_amount,currency,excerpt,status,cover_path")
    .order("title", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return { configured: true, unavailable: true, data: null };
  if (!data) return { configured: true, unavailable: false, data: null };
  const { cover_path, ...book } = data as unknown as BookViewRow;
  return { configured: true, unavailable: false, data: { ...book, cover_url: publicAssetUrl(cover_path) } };
}

export async function getPublicSiteSettings(): Promise<DataResult<PublicSiteSettings | null>> {
  const client = getPublicSupabaseClient();
  if (!client) return { configured: false, unavailable: false, data: null };
  const { data, error } = await client
    .from("public_site_settings")
    .select("admin_whatsapp_e164,support_email,legal_entity_name,business_address")
    .maybeSingle();
  if (error) return { configured: true, unavailable: true, data: null };
  return { configured: true, unavailable: false, data: data as unknown as PublicSiteSettings | null };
}
