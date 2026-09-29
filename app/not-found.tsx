import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <section className="content-page container">
      <div className="content-narrow">
        <span className="eyebrow">Maison Karidja</span>
        <h1 className="display page-title">Cette page n’est pas disponible</h1>
        <p className="muted">Le contenu demandé n’existe pas ou n’est pas publié.</p>
        <div className="button-row"><Link className="button" href="/">Retour à l’accueil</Link></div>
      </div>
    </section>
  );
}
