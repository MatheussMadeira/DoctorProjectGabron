/* Seed com as turmas de exemplo (lib/dados-exemplo.ts) e inscrições fictícias para reproduzir as contagens de vagas.
   Uso: SEED_PERMITIDO=1 yarn db:seed
   Nunca rode no banco de produção: as inscrições são fictícias (e-mail @exemplo.invalid). */
import { isNull, like } from "drizzle-orm";
import { TURMAS_EXEMPLO } from "@/lib/dados-exemplo";
import { db, pool } from "./index";
import { inscricoes, turmas, type Situacao } from "./schema";

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

  const total = await db.select({ slug: turmas.slug }).from(turmas).where(isNull(turmas.excluidaEm));
  console.log(`Seed ok: ${TURMAS_EXEMPLO.length} turmas (${total.length} no banco).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
