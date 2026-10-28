import { NextIntlClientProvider } from "next-intl";
import { Suspense, type ReactNode } from "react";

/* /dev/componentes mostra os componentes públicos (formulários, Header…), que usam next-intl. O painel é só pt-BR: o provedor cai no
   idioma padrão (i18n/request.ts). Ler a requisição é dado dinâmico, então tudo fica dentro de um Suspense. */
export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </Suspense>
  );
}
