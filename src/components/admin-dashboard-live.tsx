"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardSnapshot = {
  days: number;
  updatedAt: string;
  totals: {
    orders: number;
    paidOrders: number;
    pendingPayments: number;
    publishedBooks: number;
    publishedProducts: number;
    nonRevokedDeliveries: number;
    whatsappPending: number;
  };
  trend: { day: string; orders: number; paid: number }[];
  truncated: boolean;
};

const numberFormat = new Intl.NumberFormat("fr-FR");
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });

function makeLine(points: DashboardSnapshot["trend"], key: "orders" | "paid", width: number, height: number, max: number): string {
  const left = 24;
  const top = 16;
  const plotWidth = width - left * 2;
  const plotHeight = height - top - 28;
  return points.map((point, index) => {
    const x = left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * plotWidth);
    const y = top + plotHeight - (point[key] / max) * plotHeight;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function AdminDashboardLive({ adminBasePath }: { adminBasePath: string }) {
  const [days, setDays] = useState(30);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setRefreshing(true);
      try {
        const response = await fetch(`${adminBasePath}/api/dashboard-data?days=${days}`, { cache: "no-store" });
        if (!response.ok) throw new Error("METRICS_UNAVAILABLE");
        const next = await response.json() as DashboardSnapshot;
        if (active) {
          setSnapshot(next);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setRefreshing(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [adminBasePath, days]);

  const maxValue = useMemo(() => Math.max(1, ...(snapshot?.trend.map((point) => point.orders) ?? [])), [snapshot]);
  const updatedAt = snapshot ? new Date(snapshot.updatedAt) : null;
  const cards = snapshot ? [
    { label: `Commandes (${days} j)`, value: snapshot.totals.orders, note: `${snapshot.totals.paidOrders} payées` },
    { label: "Paiements à vérifier", value: snapshot.totals.pendingPayments, note: "sur la période choisie" },
    { label: "Catalogue publié", value: snapshot.totals.publishedBooks + snapshot.totals.publishedProducts, note: `${snapshot.totals.publishedBooks} livres · ${snapshot.totals.publishedProducts} produits` },
    { label: "Livraisons non révoquées", value: snapshot.totals.nonRevokedDeliveries, note: "enregistrements de livraison" },
    { label: "WhatsApp à traiter", value: snapshot.totals.whatsappPending, note: "messages préparés, non envoyés" },
  ] : [];

  return (
    <section className="admin-live-dashboard" aria-labelledby="admin-live-title">
      <div className="dashboard-live-heading">
        <div>
          <span className="eyebrow">Activité des services</span>
          <h2 id="admin-live-title">Vue en direct</h2>
          <p className="muted">Commandes, paiements, catalogue, livraisons et WhatsApp.</p>
        </div>
        <div className="dashboard-controls">
          <label htmlFor="dashboard-days">Période</label>
          <select id="dashboard-days" value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
            <option value={90}>90 jours</option>
          </select>
          <span className="dashboard-refresh" role="status">{refreshing ? "Actualisation…" : "Actualisation auto · 30 s"}</span>
        </div>
      </div>

      {error && <p className="notice" role="status">Les données ne sont pas à jour. Le dernier relevé disponible est conservé.</p>}
      {!snapshot && !error && <p className="notice" role="status">Chargement des indicateurs sécurisés…</p>}

      {snapshot && (
        <>
          <div className="dashboard-live-cards">
            {cards.map((card) => (
              <article className="dashboard-live-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{numberFormat.format(card.value)}</strong>
                <small>{card.note}</small>
              </article>
            ))}
          </div>
          <div className="dashboard-chart-panel">
            <div className="dashboard-chart-heading">
              <div><h3>Commandes et paiements confirmés</h3><p className="muted">Volume quotidien · {days} derniers jours</p></div>
              {updatedAt && <time dateTime={snapshot.updatedAt}>Mis à jour à {updatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>}
            </div>
            {snapshot.trend.every((point) => point.orders === 0) ? (
              <div className="dashboard-chart-empty">Aucune commande sur cette période.</div>
            ) : (
              <>
                <div className="dashboard-legend"><span><i className="legend-orders" />Commandes</span><span><i className="legend-paid" />Payées</span></div>
                <svg className="dashboard-chart" viewBox="0 0 760 250" role="img" aria-label={`Graphique des commandes et paiements confirmés sur ${days} jours`}>
                  <line x1="24" y1="20" x2="736" y2="20" className="chart-gridline" />
                  <line x1="24" y1="117" x2="736" y2="117" className="chart-gridline" />
                  <line x1="24" y1="214" x2="736" y2="214" className="chart-gridline" />
                  <path d={makeLine(snapshot.trend, "orders", 760, 250, maxValue)} className="chart-line chart-line-orders" />
                  <path d={makeLine(snapshot.trend, "paid", 760, 250, maxValue)} className="chart-line chart-line-paid" />
                </svg>
                <div className="dashboard-chart-labels">
                  {snapshot.trend.filter((_, index) => index === 0 || index === Math.floor((snapshot.trend.length - 1) / 2) || index === snapshot.trend.length - 1).map((point) => (
                    <span key={point.day}>{dateFormat.format(new Date(`${point.day}T12:00:00Z`))}</span>
                  ))}
                </div>
              </>
            )}
            {snapshot.truncated && <p className="form-note">Le graphique est limité aux 5 000 commandes les plus récentes de la période.</p>}
          </div>
        </>
      )}
    </section>
  );
}
