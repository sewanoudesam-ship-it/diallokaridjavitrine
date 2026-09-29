import type { Metadata } from "next";
import { CartView } from "@/src/components/cart-view";
import { getPublicSiteSettings, listPublishedProducts } from "@/src/lib/data/public";
import { pageMetadata } from "@/src/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  path: "/panier",
  title: "Panier",
  description: "Vérifiez les articles publiés et préparez votre demande de commande pour Maison Karidja.",
  noindex: true,
});

export default async function CartPage() {
  const [products, settings] = await Promise.all([listPublishedProducts(), getPublicSiteSettings()]);
  const ready = products.configured && !products.unavailable && settings.configured && !settings.unavailable && Boolean(settings.data?.admin_whatsapp_e164);
  return (
    <section className="content-page container">
      <div className="section-heading"><span className="eyebrow">Maison Karidja</span><h1 className="display page-title">Votre panier</h1></div>
      <CartView products={products.data} settings={settings.data} backendReady={ready} />
    </section>
  );
}
