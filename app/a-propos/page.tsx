import type { Metadata } from "next";
import { EmptyState } from "@/src/components/empty-state";
import { pageMetadata } from "@/src/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/a-propos",
  title: "À propos",
  description: "Maison Karidja, espace officiel des publications de DIALLO Karidja.",
});

export default function AboutPage() {
  return (
    <section className="content-page container">
      <div className="content-narrow">
        <span className="eyebrow">Maison Karidja</span>
        <h1 className="display page-title">À propos</h1>
        <p>Maison Karidja est portée par DIALLO Karidja, autrice du livre « Une Seule Histoire ».</p>
        <EmptyState title="La présentation de la maison sera complétée par Karidja">
          <p>Aucune autre biographie, promesse, histoire de marque ou information personnelle n’est publiée sans validation de son autrice.</p>
        </EmptyState>
      </div>
    </section>
  );
}
