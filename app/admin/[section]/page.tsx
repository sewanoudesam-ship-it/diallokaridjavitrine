import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminBooksManager, type AdminBookRow } from "@/src/components/admin-books-manager";
import { AdminOrdersManager, type AdminOrderRecord } from "@/src/components/admin-orders-manager";
import { AdminProductsManager, type AdminProductRow } from "@/src/components/admin-products-manager";
import { AdminSettingsForm, type AdminSettings } from "@/src/components/admin-settings-form";
import { AdminAccountsManager } from "@/src/components/admin-accounts-manager";
import { AdminLogoutButton } from "@/src/components/admin-logout-button";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { publicAssetUrl } from "@/src/lib/supabase/storage-url";
import { getAdminBasePath, toPublicAdminPath } from "@/src/lib/admin-route";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration — Maison Karidja", robots: { index: false, follow: false } };

const sectionTitles: Record<string, string> = {
  livres: "Livres",
  produits: "Produits et bijoux",
  commandes: "Commandes",
  reglages: "Réglages",
  comptes: "Comptes administrateur",
};

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const adminBasePath = getAdminBasePath();
  if (!adminBasePath) notFound();
  if (!Object.hasOwn(sectionTitles, section)) notFound();
  const client = await getSupabaseServerClient();
  if (!client) return <section className="content-page container"><h1 className="display page-title">{sectionTitles[section]}</h1><p className="notice">Cette section attend la configuration réelle de Supabase.</p></section>;
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(toPublicAdminPath("/admin/connexion") ?? "/");
  const { data: role, error: roleError } = await client.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleError || role?.role !== "admin") return <section className="content-page container"><h1 className="display page-title">Accès refusé</h1><p className="notice">Ce compte n’a pas le rôle administrateur requis.</p><Link className="text-link" href={adminBasePath}>Retour à l’administration</Link></section>;

  let content;
  if (section === "livres") {
    const { data, error } = await client.from("books")
      .select("id,title,author,slug,description,excerpt,price_amount,currency,status,cover_path,original_pdf_path,created_at,published_at")
      .order("created_at", { ascending: false }).limit(200);
    const books: AdminBookRow[] = (data ?? []).map((book) => ({
      id: book.id, title: book.title, author: book.author, slug: book.slug, description: book.description, excerpt: book.excerpt,
      price_amount: book.price_amount === null ? null : Number(book.price_amount), currency: book.currency, status: book.status, cover_url: publicAssetUrl(book.cover_path),
      has_original_pdf: Boolean(book.original_pdf_path), created_at: book.created_at, published_at: book.published_at,
    }));
    content = error ? <p className="notice">Les fiches livre ne sont pas disponibles actuellement.</p> : <AdminBooksManager books={books} />;
  } else if (section === "produits") {
    const { data, error } = await client.from("products")
      .select("id,name,slug,reference,description,category,price_amount,currency,availability,status,created_at,published_at")
      .order("created_at", { ascending: false }).limit(200);
    const productRows = data ?? [];
    const ids = productRows.map((product) => product.id);
    const imageResult = ids.length ? await client.from("product_images")
      .select("product_id,storage_path,alt_text").in("product_id", ids).eq("is_primary", true).limit(200) : { data: [], error: null };
    const imageByProduct = new Map((imageResult.data ?? []).map((image) => [image.product_id, image]));
    const products: AdminProductRow[] = productRows.map((product) => {
      const image = imageByProduct.get(product.id);
      return {
        id: product.id, name: product.name, slug: product.slug, reference: product.reference, description: product.description, category: product.category,
        price_amount: Number(product.price_amount), currency: product.currency, availability: product.availability, status: product.status,
        image_url: publicAssetUrl(image?.storage_path), image_alt: image?.alt_text ?? null,
        created_at: product.created_at, published_at: product.published_at,
      };
    });
    content = error ? <p className="notice">Les produits ne sont pas disponibles actuellement.</p> : <AdminProductsManager products={products} />;
  } else if (section === "reglages") {
    const { data, error } = await client.from("site_settings")
      .select("admin_whatsapp_e164,payment_instructions,support_email,legal_entity_name,business_address")
      .eq("singleton", true).maybeSingle();
    const settings: AdminSettings = data ? {
      admin_whatsapp_e164: data.admin_whatsapp_e164, payment_instructions: data.payment_instructions,
      support_email: data.support_email, legal_entity_name: data.legal_entity_name, business_address: data.business_address,
    } : null;
    content = error ? <p className="notice">Les réglages ne sont pas disponibles actuellement.</p> : <AdminSettingsForm settings={settings} />;
  } else if (section === "comptes") {
    content = <AdminAccountsManager />;
  } else {
    const { data: rows, error: ordersError } = await client.from("orders")
      .select("id,order_number,order_type,customer_name,phone_e164,country_iso,email,total_amount,currency,payment_status,status,created_at,paid_at")
      .order("created_at", { ascending: false }).limit(100);
    if (ordersError) {
      content = <p className="notice">Les commandes ne sont pas disponibles actuellement.</p>;
    } else {
      const orders = rows ?? [];
      const orderIds = orders.map((order) => order.id);
      const [itemsResult, deliveriesResult, messagesResult] = orderIds.length ? await Promise.all([
        client.from("order_items").select("order_id,item_name_snapshot,quantity,unit_price_snapshot,currency_snapshot").in("order_id", orderIds).limit(2000),
        client.from("digital_deliveries").select("id,order_id,created_at,created_by,revoked_at").in("order_id", orderIds).limit(100),
        client.from("whatsapp_messages").select("id,order_id,prepared_at,prepared_by,sent_at,sent_by").in("order_id", orderIds).order("prepared_at", { ascending: false }).limit(500),
      ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
      const deliveries = deliveriesResult.data ?? [];
      const deliveryIds = deliveries.map((delivery) => delivery.id);
      const accessResult = deliveryIds.length ? await client.from("download_access")
        .select("delivery_id,downloaded_count,max_downloads,expires_at,revoked_at").in("delivery_id", deliveryIds).limit(100) : { data: [], error: null };
      const accessByDelivery = new Map((accessResult.data ?? []).map((access) => [access.delivery_id, access]));
      const deliveryByOrder = new Map(deliveries.map((delivery) => {
        const access = accessByDelivery.get(delivery.id);
        return [delivery.order_id, {
          id: delivery.id, created_at: delivery.created_at, created_by: delivery.created_by, revoked_at: delivery.revoked_at ?? access?.revoked_at ?? null,
          downloaded_count: access?.downloaded_count ?? 0, max_downloads: access?.max_downloads ?? 2, expires_at: access?.expires_at ?? null,
        }];
      }));
      const itemsByOrder = new Map<string, AdminOrderRecord["items"]>();
      for (const item of itemsResult.data ?? []) {
        const current = itemsByOrder.get(item.order_id) ?? [];
        current.push({ item_name_snapshot: item.item_name_snapshot, quantity: item.quantity, unit_price_snapshot: Number(item.unit_price_snapshot), currency_snapshot: item.currency_snapshot });
        itemsByOrder.set(item.order_id, current);
      }
      const messagesByOrder = new Map<string, AdminOrderRecord["messages"]>();
      for (const message of messagesResult.data ?? []) {
        const current = messagesByOrder.get(message.order_id) ?? [];
        current.push({ id: message.id, prepared_at: message.prepared_at, prepared_by: message.prepared_by, sent_at: message.sent_at, sent_by: message.sent_by });
        messagesByOrder.set(message.order_id, current);
      }
      const adminOrders: AdminOrderRecord[] = orders.map((order) => ({
        id: order.id, order_number: order.order_number, order_type: order.order_type, customer_name: order.customer_name,
        phone_e164: order.phone_e164, country_iso: order.country_iso, email: order.email, total_amount: Number(order.total_amount),
        currency: order.currency, payment_status: order.payment_status, status: order.status, created_at: order.created_at, paid_at: order.paid_at,
        items: itemsByOrder.get(order.id) ?? [], delivery: deliveryByOrder.get(order.id) ?? null, messages: messagesByOrder.get(order.id) ?? [],
      }));
      content = <AdminOrdersManager orders={adminOrders} />;
    }
  }

  return (
    <section className="content-page container">
      <div className="admin-heading">
        <div><span className="eyebrow">Administration Maison Karidja</span><h1 className="display page-title">{sectionTitles[section]}</h1></div>
        <div className="admin-user"><span className="muted">{user.email}</span><AdminLogoutButton adminBasePath={adminBasePath} /></div>
      </div>
      <nav className="admin-nav" aria-label="Sections d’administration">
        <Link href={adminBasePath}>Vue d’ensemble</Link>
        {Object.entries(sectionTitles).map(([key, title]) => <Link href={`${adminBasePath}/${key}`} key={key} aria-current={section === key ? "page" : undefined}>{title}</Link>)}
      </nav>
      {content}
    </section>
  );
}
