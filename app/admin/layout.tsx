import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/atoms";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel" },
  robots: { index: false, follow: false },
};

/* As páginas do painel leem a sessão (cookies), que é dado de requisição: com cacheComponents isso precisa
   ficar dentro de um Suspense. O shell estático sai na hora e o conteúdo chega em seguida. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Skeleton variant="text" lines={6} />}>{children}</Suspense>;
}
