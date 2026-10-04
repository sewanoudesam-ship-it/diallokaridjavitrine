import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPasswordUpdateForm } from "@/src/components/admin-password-update-form";
import { getAdminBasePath } from "@/src/lib/admin-route";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false, follow: false } };

export default async function AdminPasswordUpdatePage() {
  const adminBasePath = getAdminBasePath();
  if (!adminBasePath) notFound();
  return (
    <section className="content-page container">
      <div className="content-narrow">
        <span className="eyebrow">Espace privé</span>
        <h1 className="display page-title">Choisir un nouveau mot de passe</h1>
        <p className="muted">Utilisez au moins 12 caractères et évitez de réutiliser un mot de passe déjà employé.</p>
        <AdminPasswordUpdateForm adminBasePath={adminBasePath} />
      </div>
    </section>
  );
}
