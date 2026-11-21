import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { Suspense } from "react";
import { PreviewClient } from "@/components/editor/PreviewClient";
import { construirCorpos } from "@/components/site-secoes/slots";
import { PublicTemplate } from "@/components/templates";
import { criarTradutorCompleto } from "@/lib/i18n/mensagens";
import { pode } from "@/lib/permissoes";
import { usuarioAtual } from "@/lib/sessao";
import { carregarPaginaEditor } from "@/lib/site-secoes/editor";
import { ehPagina } from "@/lib/site-secoes/paginas";

export const metadata: Metadata = { title: "Prévia", robots: { index: false, follow: false } };

/* A página real com o RASCUNHO, para o iframe do editor. Só para quem tem a permissão "site:editar" (conferida no banco a cada abertura);
   o login do painel é o portão: não há cookie de rascunho para vazar. O conteúdo das seções chega depois, por postMessage. */
async function Previa({ pagina }: { pagina: string }) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/admin/login");
  if (!pode(usuario.papel, "site:editar") || !ehPagina(pagina)) notFound();

  const estado = await carregarPaginaEditor(pagina);
  const corpos = await construirCorpos(pagina, "pt-BR", criarTradutorCompleto("pt-BR"));
  return (
    <NextIntlClientProvider>
      <PublicTemplate hideWhatsApp>
        <PreviewClient
          pagina={pagina}
          inicial={estado.secoes.map((s) => ({ chave: s.chave, tipo: s.tipo, rotulo: s.rotulo, visivel: s.visivel, conteudo: s.conteudo }))}
          slots={corpos.slots}
          nProfessores={corpos.nProfessores}
          chamada={corpos.chamada}
        />
      </PublicTemplate>
    </NextIntlClientProvider>
  );
}

export default async function PreviaPage({ params }: PageProps<"/admin/editor/preview/[pagina]">) {
  const { pagina } = await params;
  return (
    <Suspense fallback={null}>
      <Previa pagina={pagina} />
    </Suspense>
  );
}
