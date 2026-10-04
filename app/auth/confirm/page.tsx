import type { Metadata } from "next";
import { AuthConfirmClient } from "@/src/components/auth-confirm-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Vérification sécurisée",
  robots: { index: false, follow: false },
};

export default function AuthConfirmPage() {
  return <AuthConfirmClient />;
}
