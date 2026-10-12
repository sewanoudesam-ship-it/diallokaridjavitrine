import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminLoginForm } from "@/src/components/admin-login-form";
import { getAdminBasePath } from "@/src/lib/admin-route";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connexion administrateur", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const adminBasePath = getAdminBasePath();
  if (!adminBasePath) notFound();
  const { auth } = await searchParams;
  return (
    <section className="content-page container">
      <div className="content-narrow">
        <span className="eyebrow">Espace privé</span>
        <h1 className="display page-title">Connexion administrateur</h1>
        <p className="muted">L’inscription est ouverte : toute personne qui confirme son adresse e-mail reçoit les droits administrateur. Créez votre compte depuis le lien d’inscription ou connectez-vous ci-dessous.</p>
        {auth === "invalid-link" && <p className="notice" role="status">Le lien de validation est invalide ou expiré. Relancez l’activation ou la récupération de mot de passe.</p>}
        {auth === "unavailable" && <p className="notice" role="status">Le service d’authentification est temporairement indisponible. Réessayez plus tard.</p>}
        <AdminLoginForm adminBasePath={adminBasePath} />
      </div>
    </section>
  );
}
