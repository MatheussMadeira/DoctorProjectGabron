// Cadastra a Alumni de EXEMPLO (duas turmas realizadas, alunos espalhados pelo Brasil e pelo mundo, um depoimento com vídeo) para ver o
// mapa funcionando em DESENVOLVIMENTO. Só entra se não houver nenhuma turma realizada cadastrada. Os nomes são fictícios e já vêm
// "autorizados" para aparecer: apague tudo em /admin/alumni (e o depoimento de exemplo) antes de abrir o site de verdade.
// Uso: yarn alumni:exemplo
import { db } from "../db";
import { alumni, alumniTurmas, depoimentos } from "../db/schema";

const jaTem = (await db.select({ id: alumniTurmas.id }).from(alumniTurmas).limit(1)).length > 0;
if (jaTem) {
  console.log("Já existem turmas realizadas cadastradas: nada a fazer.");
  process.exit(0);
}

const hoje = new Date().toISOString().slice(0, 10);
const [t1, t2] = await db
  .insert(alumniTurmas)
  .values([
    { titulo: "Turma de exemplo (agosto de 2026)", dataInicio: "2026-08-15", dataFim: "2026-08-16", cidade: "Belo Horizonte, MG", numeroAlunos: 14, resumo: "Exemplo: duas jornadas de teoria e prática supervisionada, com alunos de vários estados.", visivel: true, ordem: 0 },
    { titulo: "Turma de exemplo (março de 2026)", dataInicio: "2026-03-07", dataFim: "2026-03-08", cidade: "Belo Horizonte, MG", numeroAlunos: 12, resumo: "Exemplo: primeira turma presencial do ano.", visivel: true, ordem: 1 },
  ])
  .returning({ id: alumniTurmas.id });

const pessoas = [
  { nome: "Aluna de exemplo 1", profissao: "Dentista", cidade: "Recife", uf: "PE", latitude: -8.0476, longitude: -34.877, turma: t1.id },
  { nome: "Aluno de exemplo 2", profissao: "Médico", cidade: "São Paulo", uf: "SP", latitude: -23.5505, longitude: -46.6333, turma: t1.id },
  { nome: "Aluna de exemplo 3", profissao: "Biomédica", cidade: "São Paulo", uf: "SP", latitude: -23.5505, longitude: -46.6333, turma: t2.id },
  { nome: "Aluno de exemplo 4", profissao: "Médico", cidade: "Belo Horizonte", uf: "MG", latitude: -19.9167, longitude: -43.9345, turma: t2.id },
  { nome: "Aluna de exemplo 5", profissao: "Farmacêutica", cidade: "Porto Alegre", uf: "RS", latitude: -30.0346, longitude: -51.2177, turma: t1.id },
  { nome: "Aluno de exemplo 6", profissao: "Dentista", cidade: "Manaus", uf: "AM", latitude: -3.119, longitude: -60.0217, turma: t2.id },
  { nome: "Aluna de exemplo 7", profissao: "Médica", cidade: "Brasília", uf: "DF", latitude: -15.7939, longitude: -47.8828, turma: t1.id },
  { nome: "Aluno de exemplo 8", profissao: "Biomédico", cidade: "Fortaleza", uf: "CE", latitude: -3.7319, longitude: -38.5267, turma: t1.id },
  { nome: "Aluna de exemplo 9", profissao: "Dentista", cidade: "Curitiba", uf: "PR", latitude: -25.4284, longitude: -49.2733, turma: t2.id },
  { nome: "Aluno de exemplo 10", profissao: "Médico", cidade: "Lisboa", uf: null, pais: "PT", latitude: 38.7223, longitude: -9.1393, turma: t2.id },
  { nome: "Aluna de exemplo 11", profissao: "Dentista", cidade: "Miami", uf: null, pais: "US", latitude: 25.7617, longitude: -80.1918, turma: t1.id },
];
await db.insert(alumni).values(pessoas.map(({ turma, pais, ...p }) => ({ ...p, pais: pais ?? "BR", alumniTurmaId: turma, autorizacaoRecebidaEm: hoje, visivel: true })));

await db.insert(depoimentos).values({
  nome: "Depoimento de exemplo",
  profissao: "Dentista",
  cidade: "Recife",
  uf: "PE",
  pais: "BR",
  latitude: -8.0476,
  longitude: -34.877,
  texto: "Exemplo de depoimento em vídeo: a formação mudou a minha segurança na hora de indicar e aplicar. Troque este texto e este vídeo pelo relato de verdade.",
  videoUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  ordem: 99,
  visivel: true,
  pendente: false,
  autorizacaoRecebidaEm: hoje,
});

console.log(`Alumni de exemplo cadastrada: 2 turmas, ${pessoas.length} alunos e 1 depoimento com vídeo. Para traduzir: yarn i18n:traduzir-banco --aplicar --so alumniTurma,alumni,depoimento`);
process.exit(0);
