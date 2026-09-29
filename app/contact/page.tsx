import type { Metadata } from "next";
import { EmptyState } from "@/src/components/empty-state";
import { getPublicSiteSettings } from "@/src/lib/data/public";
import { pageMetadata } from "@/src/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  path: "/contact",
  title: "Contact",
  description: "Les coordonnées de contact de Maison Karidja, lorsqu’elles sont publiées par Karidja.",
});

export default async function ContactPage() {
  const result = await getPublicSiteSettings();
  const settings = result.data;
  const hasDetails = Boolean(settings?.admin_whatsapp_e164 || settings?.support_email || settings?.business_address);
  return (
    <section className="content-page container content-narrow">
      <span className="eyebrow">Maison Karidja</span>
      <h1 className="display page-title">Contact</h1>
      {hasDetails ? (
        <div className="contact-card">
          {settings?.admin_whatsapp_e164 && <p><strong>WhatsApp :</strong> <a href={`https://wa.me/${settings.admin_whatsapp_e164.replace(/\D/g, "")}`}>{settings.admin_whatsapp_e164}</a></p>}
          {settings?.support_email && <p><strong>E-mail :</strong> <a href={`mailto:${settings.support_email}`}>{settings.support_email}</a></p>}
          {settings?.business_address && <p><strong>Adresse :</strong> {settings.business_address}</p>}
        </div>
      ) : (
        <EmptyState title={result.unavailable ? "Les coordonnées ne sont pas disponibles" : "Les coordonnées ne sont pas encore publiées"}>
          <p>Maison Karidja affichera ici uniquement les coordonnées configurées par Karidja.</p>
        </EmptyState>
      )}
    </section>
  );
}
