import type { Metadata } from "next";
import { AuthCallbackRouter } from "@/src/components/auth-callback-router";
import { CartProvider } from "@/src/components/cart-provider";
import { SiteFooter } from "@/src/components/site-footer";
import { SiteHeader } from "@/src/components/site-header";
import { getConfiguredSiteOrigin } from "@/src/lib/seo";
import "./globals.css";

const siteOrigin = getConfiguredSiteOrigin();

export const metadata: Metadata = {
  metadataBase: siteOrigin ? new URL(siteOrigin) : undefined,
  title: { default: "Maison Karidja", template: "%s | Maison Karidja" },
  description: "Le site officiel des publications et créations de DIALLO Karidja.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <AuthCallbackRouter />
        <CartProvider>
          <a className="skip-link" href="#contenu">Aller au contenu</a>
          <SiteHeader />
          <main id="contenu">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
