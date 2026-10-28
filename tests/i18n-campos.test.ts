import assert from "node:assert/strict";
import { test } from "node:test";
import { extrairTextos, NAO_TRADUZIR, pareceNaoTexto, sobrepor } from "../lib/i18n/estrutura";

/* Só texto lido pelas pessoas é traduzível: foto, link, slug, e-mail, telefone, número, data, preço e código vêm sempre do português. */

const PARECE_URL_OU_CAMINHO = /^(\/|https?:)|:\/\//i;

/** Falha se algum texto que iria para a tradução tiver cara de URL ou caminho. */
const verificarCampos = (origem: Record<string, unknown>) => {
  for (const [campo, valor] of Object.entries(origem)) {
    for (const texto of extrairTextos(valor, campo)) {
      assert.doesNotMatch(texto, PARECE_URL_OU_CAMINHO, `o campo "${campo}" mandaria "${texto}" para a tradução`);
      assert.equal(pareceNaoTexto(texto), false, `o campo "${campo}" mandaria "${texto}" para a tradução`);
    }
  }
};

test("o que não é texto nunca é extraído para tradução, em qualquer campo", () => {
  const naoTexto = ["/images/maos.webp", "https://exemplo.com/a.jpg", "//cdn.exemplo.com/x", "mailto:a@b.com", "contato@exemplo.com.br", "+55 11 91234-5678", "40", "12,5", "R$ 1.990,00", "2026-11-21", "09:00", "modulo-essencial-nov-2026", "#inscricao", "  "];
  for (const v of naoTexto) assert.deepEqual(extrairTextos(v, "qualquerCampo"), [], `"${v}" não deveria ser traduzido`);
  assert.deepEqual(extrairTextos({ fotoUrl: "/images/maos.webp", fotoAlt: "Mãos em luvas", titulo: "ReabToxin" }), ["Mãos em luvas", "ReabToxin"]);
  assert.deepEqual(extrairTextos([{ valor: "12", rotulo: "Turmas" }, { href: "/agenda", url: "/x", texto: "Ver turmas" }]), ["Turmas", "Ver turmas"]);
});

test("texto de verdade continua sendo traduzido", () => {
  for (const v of ["Mãos em luvas preparando uma aplicação", "São Paulo", "Sábado e domingo, das 9h às 18h", "ReabToxin", "Em até 10x"]) assert.equal(pareceNaoTexto(v), false, v);
});

test("campos traduzíveis das entidades: nenhum valor com cara de URL ou caminho", () => {
  verificarCampos({ titulo: "Módulo essencial", resumo: "Curso prático", fotoAlt: "Mãos", programacao: [{ dia: "Dia 1", itens: [{ time: "09:00", title: "Abertura" }] }], faq: [{ q: "Tem certificado?", a: "Sim." }] });
  // O formato antigo do topo da home (fotoUrl como campo de primeiro nível) já não é traduzido.
  verificarCampos({ sobretitulo: "Formação", titulo: "ReabToxin", frase: "Curso prático", fotoUrl: "/images/maos.webp", fotoAlt: "Mãos" });
  assert.ok(NAO_TRADUZIR.has("fotoUrl"));
});

test("uma tradução antiga com foto estragada não vence a foto do português", () => {
  const pt = { titulo: "ReabToxin", fotoUrl: "/images/maos.webp", fotoAlt: "Mãos" };
  const lido = sobrepor(pt, { titulo: "ReabToxin", fotoUrl: "[es] /images/maos.webp", fotoAlt: "Manos" }, Object.keys(pt) as Array<keyof typeof pt & string>);
  assert.equal(lido.fotoUrl, "/images/maos.webp");
  assert.equal(lido.fotoAlt, "Manos");
});

test("entidades do banco: o português traduzível não traz URL nem caminho", { skip: process.env.TESTES_BANCO !== "1" && "defina TESTES_BANCO=1" }, async () => {
  const { db } = await import("../db");
  const { ENTIDADES } = await import("../lib/i18n/campos");
  const { turmas, professores, fotosGaleria, configuracoes, textosCurso, depoimentos } = await import("../db/schema");
  const fontes = { turma: turmas, professor: professores, foto: fotosGaleria, config: configuracoes, textoCurso: textosCurso, depoimento: depoimentos } as const;
  const chaves = { turma: "id", professor: "id", foto: "id", config: "id", textoCurso: "bloco", depoimento: "id" } as const;
  for (const [nome, tabela] of Object.entries(fontes)) {
    const linhas = (await db.select().from(tabela as never).limit(20)) as Array<Record<string, unknown>>;
    for (const l of linhas) {
      const origem = await ENTIDADES[nome as keyof typeof fontes].lerOrigem(l[chaves[nome as keyof typeof fontes]] as string);
      assert.ok(origem, `${nome}: sem origem`);
      assert.ok(!("fotoUrl" in origem) && !("slug" in origem) && !("email" in origem) && !("telefone" in origem), `${nome}: campo que não é texto na lista de traduzíveis`);
      verificarCampos(origem);
    }
  }
});

test("imagem: só caminho do site ou URL http(s) válida é aceita como src", async () => {
  const { srcValido } = await import("../components/atoms/ImagemSegura");
  for (const ok of ["/images/maos.webp", "https://exemplo.com/a.jpg", "http://localhost:3000/a.png"]) assert.equal(srcValido(ok), true, ok);
  for (const ruim of ["[es] /images/maos.webp", "maos.webp", "//cdn.exemplo.com/x.jpg", "javascript:alert(1)", "", "  ", "/a b.jpg", undefined, null, 42]) assert.equal(srcValido(ruim), false, String(ruim));
});
