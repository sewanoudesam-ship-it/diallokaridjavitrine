import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPasswordRequestForm } from "@/src/components/admin-password-request-form";
import { getAdminBasePath } from "@/src/lib/admin-route";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false, follow: false } };

export default async function AdminPasswordRequestPage({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const adminBasePath = getAdminBasePath();
  if (!adminBasePath) notFound();
  const { auth } = await searchParams;
  return (
    <section className="content-page container">
      <div className="content-narrow">
        <span className="eyebrow">Espace privé</span>
        <h1 className="display page-title">Récupérer l’accès</h1>
        <p className="muted">Un lien sécurisé sera envoyé à l’adresse associée au compte administrateur.</p>
        {auth === "invalid-link" && <p className="notice" role="status">Ce lien est invalide ou expiré. Vous pouvez demander un nouveau lien ci-dessous.</p>}
        <AdminPasswordRequestForm adminBasePath={adminBasePath} />
      </div>
    </section>
  );
}
