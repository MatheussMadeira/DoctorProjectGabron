import type { Metadata } from "next";
import { classesDeFonte } from "@/lib/fontes";
import { urlDoSite } from "@/lib/seo";
import "../styles/ap-tokens.css";
import "../styles/bundle.css";
import "../styles/ajustes.css";

/* Layout raiz do painel (/admin) e da página de componentes (/dev): sempre em português, sem next-intl.
   O site público tem o próprio layout raiz em (site)/[locale]/layout.tsx. */
export const metadata: Metadata = {
  metadataBase: new URL(urlDoSite()),
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="claro" className={classesDeFonte}>
      <body>{children}</body>
    </html>
  );
}
