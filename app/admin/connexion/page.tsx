import type { Metadata } from "next";
import { AdminLoginForm } from "@/src/components/admin-login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connexion administrateur", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <section className="content-page container">
      <div className="content-narrow">
        <span className="eyebrow">Espace privé</span>
        <h1 className="display page-title">Connexion administrateur</h1>
        <p className="muted">La création d’un compte public n’est pas proposée. L’accès est réservé aux comptes autorisés par l’administration.</p>
        <AdminLoginForm />
      </div>
    </section>
  );
}
