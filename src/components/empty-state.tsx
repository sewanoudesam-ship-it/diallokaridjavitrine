import type { ReactNode } from "react";

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="empty-state" aria-live="polite">
      <div>
        <span className="eyebrow">Maison Karidja</span>
        <h2>{title}</h2>
        <div>{children}</div>
        {action && <div className="button-row" style={{ justifyContent: "center" }}>{action}</div>}
      </div>
    </section>
  );
}
