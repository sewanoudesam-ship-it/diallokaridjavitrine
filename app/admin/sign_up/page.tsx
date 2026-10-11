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
        <h1 className="display page-title">Créer un compte administrateur</h1>
        <p className="muted">Cette page est réservée aux personnes qui ont reçu un code d’accès à usage unique. Le code est vérifié côté serveur et l’adresse e-mail doit correspondre à l’invitation.</p>
        {auth === "invalid-link" && <p className="notice" role="status">Le lien de confirmation est invalide ou expiré. Recommencez l’activation pour demander un nouveau lien.</p>}
        <AdminSignupForm adminBasePath={adminBasePath} />
      </div>
    </section>
  );
}
