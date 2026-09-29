export type CurrencyCode = string;
export type ProductAvailability = "AVAILABLE" | "UNAVAILABLE";

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  reference: string;
  description: string | null;
  price_amount: number;
  currency: CurrencyCode;
  image_url: string | null;
  category: string | null;
  availability: ProductAvailability;
  status: "PUBLISHED";
}

export interface PublishedBook {
  id: string;
  title: string;
  author: string;
  slug: string;
  description: string | null;
  price_amount: number;
  currency: CurrencyCode;
  cover_url: string | null;
  excerpt: string | null;
  status: "PUBLISHED";
}

export interface PublicSiteSettings {
  admin_whatsapp_e164: string | null;
  support_email: string | null;
  legal_entity_name: string | null;
  business_address: string | null;
}
