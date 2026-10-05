import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminDashboardLive } from "@/src/components/admin-dashboard-live";
import { AdminLogoutButton } from "@/src/components/admin-logout-button";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { getAdminBasePath, toPublicAdminPath } from "@/src/lib/admin-route";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

const sections = [
  { slug: "livres", title: "Livres", description: "Fiches, fichiers et publication" },
  { slug: "produits", title: "Produits", description: "Vitrine, prix et images publiées" },
  { slug: "commandes", title: "Commandes", description: "Paiements à vérifier et accès" },
  { slug: "reglages", title: "Réglages", description: "Coordonnées et informations légales" },
  { slug: "comptes", title: "Comptes", description: "Invitations administrateur à usage unique" },
];

export default async function AdminPage() {
  const adminBasePath = getAdminBasePath();
  if (!adminBasePath) notFound();
  const client = await getSupabaseServerClient();
  if (!client) {
    return <section className="content-page container"><div className="content-narrow"><span className="eyebrow">Maison Karidja</span><h1 className="display page-title">Administration</h1><p className="notice">L’administration attend la configuration du projet Supabase et l’attribution d’un compte réel à Karidja.</p></div></section>;
  }
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(toPublicAdminPath("/admin/connexion") ?? "/");
  const { data: role, error: roleError } = await client.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleError || role?.role !== "admin") {
    return <section className="content-page container"><div className="content-narrow"><h1 className="display page-title">Accès refusé</h1><p className="notice">Ce compte n’a pas le rôle administrateur requis.</p><AdminLogoutButton adminBasePath={adminBasePath} /></div></section>;
  }

  const { data: metricRows, error: metricsError } = await client.rpc("admin_dashboard_metrics");
  const metrics = !metricsError ? metricRows?.[0] : undefined;
  const value = (number: number | undefined) => number === undefined ? "—" : number.toLocaleString("fr-FR");

  return (
    <section className="content-page container">
      <div className="admin-heading"><div><span className="eyebrow">Maison Karidja</span><h1 className="display page-title">Administration</h1></div><div className="admin-user"><span className="muted">Connecté en tant que {user.email}</span><AdminLogoutButton adminBasePath={adminBasePath} /></div></div>
      <div className="metric-grid">
        <div className="metric-card"><span>Commandes</span><strong>{value(metrics?.total_orders)}</strong></div>
        <div className="metric-card"><span>Paiements en attente</span><strong>{value(metrics?.pending_payments)}</strong></div>
        <div className="metric-card"><span>Livres vendus</span><strong>{value(metrics?.books_sold)}</strong></div>
        <div className="metric-card"><span>Téléchargements</span><strong>{value(metrics?.downloads)}</strong></div>
        <div className="metric-card"><span>Articles</span><strong>{value(metrics?.articles)}</strong></div>
        <div className="metric-card"><span>Commandes WhatsApp</span><strong>{value(metrics?.whatsapp_orders)}</strong></div>
      </div>
      <AdminDashboardLive adminBasePath={adminBasePath} />
      {metricsError && <p className="notice" role="status">Les indicateurs seront disponibles après application de la migration du dashboard Supabase.</p>}
      <div className="admin-section-grid">
        {sections.map((section) => <Link className="admin-section-card" href={`${adminBasePath}/${section.slug}`} key={section.slug}><h2>{section.title}</h2><p>{section.description}</p><span>Ouvrir →</span></Link>)}
      </div>
    </section>
  );
}
