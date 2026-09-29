import type { Metadata } from "next";
import { EmptyState } from "@/src/components/empty-state";
import { getPublicSiteSettings } from "@/src/lib/data/public";
import { pageMetadata } from "@/src/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await getPublicSiteSettings();
  const complete = Boolean(data?.legal_entity_name && data?.business_address && data?.support_email);
  return pageMetadata({
    path: "/cgv",
    title: "Conditions de vente",
    description: "Conditions de vente de Maison Karidja.",
    noindex: !complete,
  });
}

export default async function TermsPage() {
  const result = await getPublicSiteSettings();
  const settings = result.data;
  const legal = settings?.legal_entity_name && settings.business_address && settings.support_email ? settings : null;
  return (
    <section className="content-page container">
      <article className="content-narrow prose">
        <span className="eyebrow">Maison Karidja</span>
        <h1 className="display page-title">Conditions de vente</h1>
        {legal ? (
          <>
            <p>Les commandes du livre sont enregistrées en attente et le paiement est vérifié manuellement par Maison Karidja. L’accès numérique n’est créé qu’après validation effective du paiement.</p>
            <p>Les commandes de la boutique sont transmises par WhatsApp pour confirmation avec Maison Karidja. Aucun paiement n’est effectué automatiquement sur le site.</p>
            <p>Les prix et la devise applicables sont ceux affichés pour chaque article au moment de l’enregistrement de la commande.</p>
            <p>Éditeur : {legal.legal_entity_name}. Adresse : {legal.business_address}. Contact : {legal.support_email}.</p>
          </>
        ) : (
          <EmptyState title="Les conditions doivent être confirmées avant l’ouverture des commandes">
            <p>Les informations réelles de l’éditeur et les conditions commerciales ne sont pas encore finalisées. Aucun détail juridique n’est inventé.</p>
          </EmptyState>
        )}
      </article>
    </section>
  );
}
