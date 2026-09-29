import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div>
          <Link href="/" className="brand-wordmark">
            <span className="brand-mark" aria-hidden="true">MK</span>
            <span>Maison Karidja</span>
          </Link>
          <p className="muted">Le livre et les créations de Maison Karidja.</p>
        </div>
        <nav className="footer-links" aria-label="Informations">
          <Link href="/contact">Contact</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/cgv">Conditions de vente</Link>
        </nav>
      </div>
    </footer>
  );
}
