import { listarInscricoes, turmaParaExportar } from "@/lib/admin-inscricoes";
import { ROTULO_SITUACAO } from "@/lib/situacoes";
import { autorizar } from "@/lib/sessao";

/** Texto seguro para planilha: aspas dobradas e, contra injeção de fórmula, um apóstrofo antes de = + - @. */
function celula(valor: string): string {
  const texto = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${texto.replace(/"/g, '""')}"`;
}

/** CSV das inscrições de uma turma (separador ";" e BOM, para abrir certo no Excel em português). */
export async function GET(request: Request) {
  const auth = await autorizar("inscricao:gerir");
  if (!auth.ok) return new Response(auth.erro, { status: 403 });

  const id = new URL(request.url).searchParams.get("turma") ?? "";
  const turma = await turmaParaExportar(id);
  if (!turma) return new Response("Turma não encontrada.", { status: 404 });

  const dados = await listarInscricoes(turma.id);
  const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  const cabecalho = ["Nome", "E-mail", "Telefone", "Profissão", "Conselho", "Registro", "Situação", "Quer avisos", "Inscrição em", "Aceite da política em"];
  const linhas = dados.map((i) => [i.nome, i.email, i.telefone, i.profissao, i.conselho, i.registro, ROTULO_SITUACAO[i.situacao], i.querAvisos ? "Sim" : "Não", fmt.format(i.createdAt), fmt.format(i.aceitePrivacidadeEm)]);
  const corpo = [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");

  return new Response("﻿" + corpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscricoes-${turma.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
