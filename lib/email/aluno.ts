import { createElement } from "react";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { alunoMateriais, alunoModulos, alunos, inscricoes, turmas } from "@/db/schema";
import { comPrefixo, ehLocale, LOCALE_PADRAO, type Locale } from "@/lib/i18n/idiomas";
import { enviarEmail } from "./index";
import { contextoDoEmail } from "./montar";
import { AlunoNovoMaterial, AlunoRedefinir } from "./modelos/AlunoEmails";
import { urlDoSite } from "./textos";

/* E-mails da área do aluno que saem direto (sem o registro de "Reenviar"): o link de nova senha leva um token que só existe na hora do
   envio, e o aviso de material novo vai para muita gente de uma vez. Nenhum lança erro: devolvem se deu certo. */

const idiomaDe = (valor: string): Locale => (ehLocale(valor) ? valor : LOCALE_PADRAO);

export async function enviarLinkDeNovaSenha(aluno: { nome: string; email: string; idioma: string }, token: string): Promise<boolean> {
  try {
    const idioma = idiomaDe(aluno.idioma);
    const contexto = await contextoDoEmail(idioma);
    const link = `${urlDoSite()}${comPrefixo(idioma, "/sou-aluno/redefinir")}?token=${encodeURIComponent(token)}`;
    const r = await enviarEmail({ para: [aluno.email], assunto: contexto.t("alunoRedefinir.assunto"), react: createElement(AlunoRedefinir, { nome: aluno.nome, link, contexto }) });
    if (!r.ok) console.error("[aluno] e-mail de nova senha falhou:", r.erro);
    return r.ok;
  } catch (e) {
    console.error("[aluno] e-mail de nova senha falhou", e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Avisa por e-mail os alunos que enxergam este material (contas ativas e não bloqueadas, com inscrição confirmada na turma do módulo).
 * Só avisa uma vez (`notificado_em`) e só se o material já estiver publicado e com "avisar" ligado. Devolve quantos e-mails saíram.
 */
export async function avisarNovoMaterial(materialId: string): Promise<number> {
  const [m] = await db
    .select({ material: alunoMateriais, modulo: alunoModulos, turma: turmas })
    .from(alunoMateriais)
    .innerJoin(alunoModulos, eq(alunoModulos.id, alunoMateriais.moduloId))
    .innerJoin(turmas, eq(turmas.id, alunoModulos.turmaId))
    .where(eq(alunoMateriais.id, materialId));
  const agora = new Date();
  if (!m || !m.material.visivel || !m.modulo.visivel || !m.material.avisar || m.material.notificadoEm) return 0;
  if (m.material.publicarEm && m.material.publicarEm > agora) return 0;

  // Marca antes de enviar: se dois pedidos chegarem juntos (salvar e cron), só um avisa.
  const [marcado] = await db.update(alunoMateriais).set({ notificadoEm: agora }).where(and(eq(alunoMateriais.id, materialId), isNull(alunoMateriais.notificadoEm))).returning({ id: alunoMateriais.id });
  if (!marcado) return 0;

  const emails = db.select({ email: sql<string>`lower(${inscricoes.email})` }).from(inscricoes).where(and(eq(inscricoes.turmaId, m.turma.id), eq(inscricoes.situacao, "CONFIRMADA")));
  const destinatarios = await db.select().from(alunos).where(and(inArray(alunos.email, emails), eq(alunos.bloqueado, false), sql`${alunos.ativadoEm} is not null`));

  let enviados = 0;
  for (const a of destinatarios) {
    try {
      const idioma = idiomaDe(a.idioma);
      const contexto = await contextoDoEmail(idioma);
      const r = await enviarEmail({
        para: [a.email],
        assunto: contexto.t("alunoNovoMaterial.assunto", { titulo: m.material.titulo }),
        react: createElement(AlunoNovoMaterial, { nome: a.nome, titulo: m.material.titulo, modulo: m.modulo.titulo, turma: m.turma.tituloCurto ?? m.turma.titulo, link: `${urlDoSite()}${comPrefixo(idioma, "/sou-aluno")}`, contexto }),
      });
      if (r.ok) enviados++;
    } catch (e) {
      console.error("[aluno] aviso de material falhou", e instanceof Error ? e.message : e);
    }
  }
  return enviados;
}
