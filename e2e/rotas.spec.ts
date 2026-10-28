import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { turmas } from "../db/schema";

/* Sem o proxy consultando o banco, a página chama notFound() depois que o shell já saiu: o status fica 200 e a tela é
   a de "não encontrada" com noindex. Isso foi uma escolha (cada visita ao proxy acordaria o Neon); o teste garante o
   que importa: a turma inexistente nunca mostra conteúdo e nunca é indexada. */
async function conferirNaoEncontrada(request: import("@playwright/test").APIRequestContext, caminho: string) {
  const html = await (await request.get(caminho)).text();
  expect(html).toContain("Página não encontrada");
  expect(html).toMatch(/<meta name="robots" content="noindex/);
  // O texto "Enviar inscrição" também aparece nas mensagens que o servidor manda ao navegador (next-intl); o que não pode existir é o formulário.
  expect(html).not.toMatch(/<form/);
}

test("slug que não existe mostra a página 404 com noindex", async ({ request }) => {
  await conferirNaoEncontrada(request, "/agenda/nao-existe");
});

test("slug existente mostra a turma", async ({ request }) => {
  const resposta = await request.get("/agenda/modulo-essencial-nov-2026");
  expect(resposta.status()).toBe(200);
  expect(await resposta.text()).toContain("módulo essencial");
});

test("turma em rascunho não aparece no site", async ({ request }) => {
  const slug = `teste-rascunho-${Date.now()}`;
  const [t] = await db
    .insert(turmas)
    .values({
      slug, titulo: "Rascunho de teste", resumo: "Teste", descricao: "Teste", modalidade: "PRESENCIAL", publicacao: "RASCUNHO",
      inicio: "2099-01-10", horario: "8h às 18h", cidade: "Belo Horizonte, MG", vagas: 5, fotoUrl: "/images/maos.webp", fotoAlt: "Teste",
    })
    .returning({ id: turmas.id });
  try {
    await conferirNaoEncontrada(request, `/agenda/${slug}`);
  } finally {
    await db.delete(turmas).where(eq(turmas.id, t.id));
  }
});

test("o site não pode ser indexado antes da Fase 6", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /");
  const inicio = await request.get("/");
  expect(await inicio.text()).toMatch(/<meta name="robots" content="noindex/);
});
