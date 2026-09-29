import type { Metadata } from "next";
import { DownloadAccessForm } from "@/src/components/download-access-form";
import { pageMetadata } from "@/src/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  path: "/telechargement",
  title: "Accès au livre numérique",
  description: "Accès sécurisé réservé aux clients disposant du lien ou du code communiqué par Maison Karidja.",
  noindex: true,
});

type PageProps = { searchParams: Promise<{ token?: string | string[] }> };

export default async function DownloadPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  return (
    <section className="content-page container">
      <div className="content-narrow">
        <span className="eyebrow">Accès sécurisé</span>
        <h1 className="display page-title">Télécharger le livre</h1>
        <p className="muted">Saisissez le code transmis par Maison Karidja, ou utilisez le lien individuel reçu.</p>
        <DownloadAccessForm initialToken={token} />
      </div>
    </section>
  );
}
