import type { Metadata } from "next";
import { EmptyState } from "@/src/components/empty-state";
import { getPublicSiteSettings } from "@/src/lib/data/public";
import { pageMetadata } from "@/src/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await getPublicSiteSettings();
  const complete = Boolean(data?.legal_entity_name && data?.business_address && data?.support_email);
  return pageMetadata({
    path: "/confidentialite",
    title: "Confidentialité",
    description: "Informations de confidentialité de Maison Karidja.",
    noindex: !complete,
  });
}

export default async function PrivacyPage() {
  const result = await getPublicSiteSettings();
  const settings = result.data;
  const legal = settings?.legal_entity_name && settings.business_address && settings.support_email ? settings : null;
  return (
    <section className="content-page container">
      <article className="content-narrow prose">
        <span className="eyebrow">Maison Karidja</span>
        <h1 className="display page-title">Confidentialité</h1>
        {legal ? (
          <>
            <p>Les données de commande demandées sont utilisées pour traiter la commande, vérifier manuellement le paiement et remettre le livre numérique ou préparer une commande WhatsApp.</p>
            <p>Les données pertinentes peuvent inclure le nom, le numéro WhatsApp, le pays, l’adresse e-mail facultative, les lignes de commande et l’état de remise. Elles ne sont pas affichées publiquement.</p>
            <p>Pour les questions relatives aux données, contactez {legal.support_email}.</p>
            <p>Responsable de la publication : {legal.legal_entity_name}. Adresse : {legal.business_address}.</p>
          </>
        ) : (
          <EmptyState title="Cette page doit être complétée avant l’ouverture des commandes">
            <p>Les coordonnées légales réelles de l’éditeur ne sont pas encore renseignées. Cette page reste non indexée; aucune identité ou adresse n’est inventée.</p>
          </EmptyState>
        )}
      </article>
    </section>
  );
}
