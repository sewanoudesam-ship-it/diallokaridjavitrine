export type PublicationStatus = "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
export type ProductAvailability = "AVAILABLE" | "UNAVAILABLE";
export type OrderType = "BOOK" | "JEWELRY";
export type PaymentStatus = "PENDING" | "PAID" | "REJECTED" | "REFUNDED";
export type OrderStatus = "OPEN" | "COMPLETED" | "CANCELLED";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
type View<Row> = { Row: Row; Relationships: [] };

type UserRoleRow = { user_id: string; role: "admin"; granted_at: string; granted_by: string | null };
type BookRow = {
  id: string; title: string; author: string; slug: string; description: string | null; excerpt: string | null;
  price_amount: number | null; currency: string | null; cover_path: string | null; original_pdf_path: string | null;
  status: PublicationStatus; created_by: string | null; created_at: string; updated_at: string; published_at: string | null;
};
type ProductRow = {
  id: string; name: string; slug: string; reference: string; description: string | null; category: string | null; price_amount: number;
  currency: string; availability: ProductAvailability; status: PublicationStatus; created_by: string | null;
  created_at: string; updated_at: string; published_at: string | null;
};
type ProductImageRow = {
  id: string; product_id: string; storage_path: string; alt_text: string; position: number; is_primary: boolean; uploaded_by: string | null; created_at: string;
};
type SiteSettingsRow = {
  singleton: boolean; admin_whatsapp_e164: string | null; payment_instructions: string | null; support_email: string | null;
  legal_entity_name: string | null; business_address: string | null; updated_by: string | null; updated_at: string;
};
type OrderRow = {
  id: string; order_number: string; order_type: OrderType; book_id: string | null; customer_name: string; phone_e164: string;
  country_iso: string; email: string | null; total_amount: number; currency: string; payment_status: PaymentStatus; status: OrderStatus;
  paid_at: string | null; paid_by: string | null; created_at: string; updated_at: string;
};
type OrderItemRow = {
  id: string; order_id: string; item_type: OrderType; book_id: string | null; product_id: string | null; item_name_snapshot: string;
  quantity: number; unit_price_snapshot: number; currency_snapshot: string; created_at: string;
};
type DigitalDeliveryRow = {
  id: string; order_id: string; access_code_hash: string; access_code_ciphertext: string; access_token_hash: string;
  access_token_ciphertext: string; pdf_storage_path: string; created_by: string; created_at: string; revoked_at: string | null;
};
type DownloadAccessRow = {
  id: string; delivery_id: string; downloaded_count: number; max_downloads: number; expires_at: string | null;
  revoked_at: string | null; last_download_at: string | null; created_at: string;
};
type WhatsappMessageRow = {
  id: string; order_id: string; recipient_e164: string; prepared_by: string; prepared_at: string; sent_by: string | null; sent_at: string | null;
};
type AuditLogRow = { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; details: Json; created_at: string };

type DashboardMetrics = {
  total_orders: number; pending_payments: number; books_sold: number; downloads: number; articles: number; whatsapp_orders: number;
};

export type Database = {
  public: {
    Tables: {
      user_roles: Table<UserRoleRow, { user_id: string; role: "admin"; granted_at?: string; granted_by?: string | null }>;
      profiles: Table<{ user_id: string; display_name: string; created_at: string; updated_at: string }, { user_id: string; display_name: string; created_at?: string; updated_at?: string }>;
      books: Table<BookRow, {
        id?: string; title: string; author: string; slug: string; description?: string | null; excerpt?: string | null;
        price_amount?: number | null; currency?: string | null; cover_path?: string | null; original_pdf_path?: string | null;
        status?: PublicationStatus; created_by?: string | null; created_at?: string; updated_at?: string; published_at?: string | null;
      }>;
      products: Table<ProductRow, {
        id?: string; name: string; slug: string; reference: string; description?: string | null; category?: string | null;
        price_amount: number; currency: string; availability?: ProductAvailability; status?: PublicationStatus;
        created_by?: string | null; created_at?: string; updated_at?: string; published_at?: string | null;
      }>;
      product_images: Table<ProductImageRow, {
        id?: string; product_id: string; storage_path: string; alt_text: string; position?: number; is_primary?: boolean;
        uploaded_by?: string | null; created_at?: string;
      }>;
      site_settings: Table<SiteSettingsRow, {
        singleton?: boolean; admin_whatsapp_e164?: string | null; payment_instructions?: string | null; support_email?: string | null;
        legal_entity_name?: string | null; business_address?: string | null; updated_by?: string | null; updated_at?: string;
      }>;
      orders: Table<OrderRow, {
        id?: string; order_number?: string; order_type: OrderType; book_id?: string | null; customer_name: string; phone_e164: string;
        country_iso: string; email?: string | null; total_amount: number; currency: string; payment_status?: PaymentStatus; status?: OrderStatus;
        paid_at?: string | null; paid_by?: string | null; created_at?: string; updated_at?: string;
      }>;
      order_items: Table<OrderItemRow, {
        id?: string; order_id: string; item_type: OrderType; book_id?: string | null; product_id?: string | null; item_name_snapshot: string;
        quantity: number; unit_price_snapshot: number; currency_snapshot: string; created_at?: string;
      }>;
      digital_deliveries: Table<DigitalDeliveryRow, {
        id?: string; order_id: string; access_code_hash: string; access_code_ciphertext: string; access_token_hash: string;
        access_token_ciphertext: string; pdf_storage_path: string; created_by: string; created_at?: string; revoked_at?: string | null;
      }>;
      download_access: Table<DownloadAccessRow, {
        id?: string; delivery_id: string; downloaded_count?: number; max_downloads?: 2; expires_at?: string | null;
        revoked_at?: string | null; last_download_at?: string | null; created_at?: string;
      }>;
      whatsapp_messages: Table<WhatsappMessageRow, {
        id?: string; order_id: string; recipient_e164: string; prepared_by: string; prepared_at?: string; sent_by?: string | null; sent_at?: string | null;
      }>;
      audit_logs: Table<AuditLogRow, {
        id?: number; actor_id?: string | null; action: string; entity_type: string; entity_id?: string | null; details?: Json; created_at?: string;
      }>;
    };
    Views: {
      published_products: View<{
        id: string; name: string; slug: string; description: string | null; price_amount: number; currency: string;
        category: string | null; status: "PUBLISHED"; image_path: string | null; reference: string; availability: ProductAvailability;
      }>;
      published_books: View<{ id: string; title: string; author: string; slug: string; description: string | null; price_amount: number; currency: string; excerpt: string | null; status: "PUBLISHED"; cover_path: string | null }>;
      public_site_settings: View<{ admin_whatsapp_e164: string | null; support_email: string | null; legal_entity_name: string | null; business_address: string | null }>;
    };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      admin_dashboard_metrics: { Args: Record<PropertyKey, never>; Returns: DashboardMetrics[] };
      validate_customer_order_input: { Args: { p_customer_name: string; p_phone_e164: string; p_country_iso: string; p_email: string | null }; Returns: boolean };
      create_book_order: { Args: { p_book_id: string; p_customer_name: string; p_phone_e164: string; p_country_iso: string; p_email?: string | null }; Returns: { id: string; order_number: string; payment_status: PaymentStatus }[] };
      create_jewelry_order: { Args: { p_customer_name: string; p_phone_e164: string; p_country_iso: string; p_email: string | null; p_items: Json }; Returns: { id: string; order_number: string; payment_status: PaymentStatus; total_amount: number; currency: string; admin_whatsapp_e164: string }[] };
      confirm_book_payment_and_create_access: { Args: { p_order_id: string; p_actor_id: string; p_code_hash: string; p_code_ciphertext: string; p_token_hash: string; p_token_ciphertext: string; p_pdf_storage_path: string; p_expires_at?: string | null }; Returns: { delivery_id: string; order_number: string }[] };
      record_whatsapp_prepared: { Args: { p_order_id: string; p_actor_id: string }; Returns: string };
      mark_whatsapp_message_sent: { Args: { p_message_id: string; p_actor_id: string }; Returns: boolean };
      consume_download_access: { Args: { p_access_id: string }; Returns: { allowed: boolean; pdf_storage_path: string | null; download_number: number }[] };
      revoke_book_delivery: { Args: { p_delivery_id: string; p_actor_id: string }; Returns: boolean };
    };
    Enums: {
      publication_status: PublicationStatus; product_availability: ProductAvailability; order_type: OrderType;
      payment_status: PaymentStatus; order_status: OrderStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
