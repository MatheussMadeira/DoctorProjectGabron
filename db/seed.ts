/* Seed com as turmas de exemplo (lib/dados-exemplo.ts) e inscrições fictícias para reproduzir as contagens de vagas.
   Uso: SEED_PERMITIDO=1 yarn db:seed
   Nunca rode no banco de produção: as inscrições são fictícias (e-mail @exemplo.invalid). */
import { eq, isNull, like } from "drizzle-orm";
import { GALERIA_EXEMPLO, PROFESSORES_EXEMPLO, TURMAS_EXEMPLO } from "@/lib/dados-exemplo";
import { db, pool } from "./index";
import { fotosGaleria, inscricoes, professores, turmaProfessores, turmas, type Situacao } from "./schema";

if (process.env.SEED_PERMITIDO !== "1") {
  console.error("Seed bloqueado. Rode com SEED_PERMITIDO=1, e só em banco de desenvolvimento ou preview.");
  process.exit(1);
}

const EMAIL_FICTICIO = "@exemplo.invalid";

async function main() {
  await db.transaction(async (tx) => {
    // Reexecutar o seed é seguro: troca as inscrições fictícias e atualiza as turmas pelo slug.
    await tx.delete(inscricoes).where(like(inscricoes.email, `%${EMAIL_FICTICIO}`));

    for (const t of TURMAS_EXEMPLO) {
      const valores = {
        slug: t.slug,
        titulo: t.titulo,
        tituloCurto: t.tituloCurto,
        resumo: t.resumo,
        descricao: t.descricao.join("\n\n"),
        modalidade: t.modalidade === "Online" ? ("ONLINE" as const) : ("PRESENCIAL" as const),
        publicacao: t.publicacao,
        inicio: t.inicio,
        fim: t.fim ?? null,
        horario: t.horario,
        cidade: t.cidade,
        local: t.local ?? null,
        vagas: t.vagas,
        precoCentavos: null, // placeholder "R$ 0.000" até a Dra. definir o valor
        parcelamento: t.parcelamento ?? null,
        fotoUrl: t.fotoUrl,
        fotoAlt: t.fotoAlt,
        publicoAlvo: t.publicoAlvo,
        aprendizados: t.aprendizados,
        programacao: t.programacao,
        faq: t.faq,
        excluidaEm: null,
        updatedAt: new Date(),
      };
      const [turma] = await tx
        .insert(turmas)
        .values(valores)
        .onConflictDoUpdate({ target: turmas.slug, set: valores })
        .returning({ id: turmas.id });

      // Algumas confirmadas, o resto aguardando pagamento.
      const linhas = Array.from({ length: t.inscritos }, (_, i) => ({
        turmaId: turma.id,
        nome: `Nome da aluna ${i + 1}`,
        email: `${t.slug}-${i + 1}${EMAIL_FICTICIO}`,
        telefone: "(31) 00000-0000",
        profissao: "Médico(a)",
        conselho: "CRM" as const,
        registro: "00000 / MG",
        aceitePrivacidadeEm: new Date(),
        querAvisos: false,
        situacao: (i % 2 === 0 ? "CONFIRMADA" : "AGUARDANDO_PAGAMENTO") as Situacao,
      }));
      if (linhas.length) await tx.insert(inscricoes).values(linhas);
    }
  });

  // Professores: três iguais, na ordem do admin. O seed cria os que faltam (pelo nome) e atualiza função, registro e bio dos de exemplo;
  // professores que a equipe cadastrou com outros nomes ficam como estão.
  const existentes = await db.select({ id: professores.id, nome: professores.nome }).from(professores);
  const idPorNome = new Map(existentes.map((p) => [p.nome, p.id]));
  const idsDeExemplo: string[] = [];
  for (const [ordem, p] of PROFESSORES_EXEMPLO.entries()) {
    const id = idPorNome.get(p.nome);
    if (id) {
      await db.update(professores).set({ funcao: p.funcao, registro: p.registro, bio: p.bio, updatedAt: new Date() }).where(eq(professores.id, id));
      idsDeExemplo.push(id);
    } else {
      const [novo] = await db.insert(professores).values({ ...p, ordem: existentes.length + ordem, visivel: true }).returning({ id: professores.id });
      idsDeExemplo.push(novo.id);
    }
  }
  // Os três conduzem todas as turmas de exemplo.
  const idsDasTurmas = await db.select({ id: turmas.id }).from(turmas);
  if (idsDasTurmas.length) {
    await db.insert(turmaProfessores).values(idsDasTurmas.flatMap((t) => idsDeExemplo.map((professorId, ordem) => ({ turmaId: t.id, professorId, ordem })))).onConflictDoNothing();
  }
  const jaTemGaleria = (await db.select({ id: fotosGaleria.id }).from(fotosGaleria).limit(1)).length > 0;
  if (!jaTemGaleria) await db.insert(fotosGaleria).values(GALERIA_EXEMPLO.map((f, ordem) => ({ ...f, ordem })));

  const total = await db.select({ slug: turmas.slug }).from(turmas).where(isNull(turmas.excluidaEm));
  console.log(`Seed ok: ${TURMAS_EXEMPLO.length} turmas (${total.length} no banco).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
