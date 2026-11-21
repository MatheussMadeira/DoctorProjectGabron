import type { Metadata } from "next";
import { EditorApp } from "@/components/editor/EditorApp";
import { pode } from "@/lib/permissoes";
import { exigirSessao } from "@/lib/sessao";
import { carregarPaginaEditor } from "@/lib/site-secoes/editor";
import { ehPagina } from "@/lib/site-secoes/paginas";

export const metadata: Metadata = { title: "Editor visual" };

/* Editor visual das páginas Início e Sobre o curso (só ADMIN). A tela é cheia (sem a barra lateral do painel). */
export default async function EditorPage({ searchParams }: PageProps<"/admin/editor">) {
  const [usuario, params] = await Promise.all([exigirSessao(), searchParams]);
  if (!pode(usuario.papel, "site:editar")) return <p style={{ padding: 32 }}>Só administradores usam o editor visual.</p>;
  const pedida = String(params.pagina ?? "inicio");
  const pagina = ehPagina(pedida) ? pedida : "inicio";
  const inicial = await carregarPaginaEditor(pagina);
  return <EditorApp key={pagina} inicial={inicial} />;
}
