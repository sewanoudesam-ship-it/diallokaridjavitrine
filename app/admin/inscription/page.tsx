import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminSignupForm } from "@/src/components/admin-signup-form";
import { getAdminBasePath } from "@/src/lib/admin-route";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Activation administrateur", robots: { index: false, follow: false } };

export default async function AdminSignupPage({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const adminBasePath = getAdminBasePath();
  if (!adminBasePath) notFound();
  const { auth } = await searchParams;
  return (
    <section className="content-page container">
      <div className="content-narrow">
        <span className="eyebrow">Espace privé</span>
        <h1 className="display page-title">Activer un compte</h1>
        <p className="muted">Un code valide est requis. Le premier compte utilise le code bootstrap à usage unique; les suivants utilisent un code d’invitation lié à leur adresse e-mail. Un lien de confirmation sera envoyé avant la définition du mot de passe.</p>
        {auth === "invalid-link" && <p className="notice" role="status">Le lien est invalide ou expiré. Demandez une nouvelle invitation à l’administratrice.</p>}
        <AdminSignupForm adminBasePath={adminBasePath} />
      </div>
    </section>
  );
}
