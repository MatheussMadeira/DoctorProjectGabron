import assert from "node:assert/strict";
import { test } from "node:test";
import { criarTradutorCompleto } from "../lib/i18n/mensagens";
import { TEXTOS_PADRAO } from "../lib/textos-curso-base";
import { CAMPOS, comValorEm, folhasDeTexto, fotosDoConteudo, mesclarTraducao, validarConteudo, valorEm, type Conteudo, type TipoSecao } from "../lib/site-secoes/campos";
import { desfazer, empurrar, iniciarHistoria, JUNTAR_MS, podeDesfazer, podeRefazer, refazer } from "../lib/site-secoes/historia";
import { conteudoIgual } from "../lib/site-secoes/igual";
import { conteudoPadrao, PAGINAS, PAGINAS_EDITAVEIS } from "../lib/site-secoes/paginas";

/* Editor visual: o conteúdo padrão das seções vale pelos limites do editor, validação por campo, tradução só dos textos, histórico de desfazer. */

const tr = criarTradutorCompleto("pt-BR");

test("o conteúdo padrão de TODAS as seções (os textos que o site já tinha) passa na validação do editor", () => {
  for (const pagina of PAGINAS_EDITAVEIS) {
    for (const def of PAGINAS[pagina].secoes) {
      const c = conteudoPadrao(pagina, def.chave, tr, TEXTOS_PADRAO);
      const v = validarConteudo(def.tipo, c);
      assert.ok(v.ok, `${pagina}/${def.chave}: ${!v.ok ? JSON.stringify(v.erros) : ""}`);
    }
  }
});

test("as páginas têm as seções do site de hoje, na ordem de hoje", () => {
  assert.deepEqual(PAGINAS.inicio.secoes.map((s) => s.chave), ["topo", "curso", "turmas", "professores", "numeros", "depoimentos"]);
  assert.deepEqual(PAGINAS["sobre-o-curso"].secoes.map((s) => s.chave), ["topo", "proposta", "professores", "galeria", "valores"]);
  // Só seções com dados vivos (turmas, professores, galeria, depoimentos) são marcadas como `dados`.
  assert.deepEqual(PAGINAS.inicio.secoes.filter((s) => s.dados).map((s) => s.chave), ["turmas", "professores", "depoimentos"]);
});

test("validação: texto vazio, acima do limite, link e foto inválidos, lista com itens de menos ou de mais", () => {
  const base = conteudoPadrao("inicio", "curso", tr, TEXTOS_PADRAO);
  const erros = (c: Conteudo) => {
    const v = validarConteudo("curso", c);
    return v.ok ? {} : v.erros;
  };
  assert.deepEqual(erros(base), {});
  assert.equal(erros({ ...base, titulo: "" }).titulo, "Título: preencha o campo.");
  assert.equal(erros({ ...base, titulo: "x".repeat(121) }).titulo, "Título: no máximo 120 caracteres.");
  assert.ok(erros({ ...base, botaoLink: "agenda" }).botaoLink, "link sem / # ou https");
  assert.deepEqual(erros({ ...base, botaoLink: "https://exemplo.com/a" }), {});
  assert.deepEqual(erros({ ...base, botaoLink: "" }), {}, "botão é opcional");
  assert.ok(erros({ ...base, foto: { url: "javascript:alert(1)", alt: "Foto de teste" } })["foto.url"]);
  assert.ok(erros({ ...base, foto: { url: "/images/maos.webp", alt: "" } })["foto.alt"]);
  assert.ok(erros({ ...base, pilares: (base.pilares as unknown[]).slice(0, 2) }).pilares, "mínimo de 3 pilares");
  assert.ok(erros({ ...base, pilares: Array.from({ length: 6 }, () => ({ titulo: "a", texto: "b" })) }).pilares, "máximo de 5 pilares");
  assert.ok(Object.keys(erros({ ...base, pilares: [{ titulo: "", texto: "x" }, { titulo: "b", texto: "x" }, { titulo: "c", texto: "x" }] })).some((k) => k === "pilares.0.titulo"), "o erro aponta o item");
  // Campo opcional ausente vira vazio.
  const semEyebrow = { ...base } as Conteudo;
  delete semEyebrow.eyebrow;
  const v = validarConteudo("curso", semEyebrow);
  assert.ok(v.ok && v.conteudo.eyebrow === "");
});

test("tradução: só os textos e a descrição da foto vêm da tradução; links, foto, ordem e tamanho da lista vêm do português", () => {
  const pt = conteudoPadrao("inicio", "curso", tr, TEXTOS_PADRAO);
  const trad: Conteudo = {
    titulo: "How the course works",
    lead: "",
    botaoLink: "/en/hacked",
    foto: { url: "https://evil.example/x.jpg", alt: "Anatomical model" },
    pilares: (pt.pilares as Array<{ titulo: string; texto: string }>).map((p, i) => ({ titulo: `Pillar ${i + 1}`, texto: `Text ${i + 1}` })),
  };
  const m = mesclarTraducao(CAMPOS.curso, pt, trad);
  assert.equal(m.titulo, "How the course works");
  assert.equal(m.lead, pt.lead, "campo vazio na tradução cai no português");
  assert.equal(m.botaoLink, pt.botaoLink, "link nunca vem da tradução");
  assert.deepEqual(m.foto, { url: (pt.foto as { url: string }).url, alt: "Anatomical model" }, "a foto é a do português; só a descrição é traduzida");
  assert.deepEqual((m.pilares as Array<{ titulo: string }>).map((p) => p.titulo), ["Pillar 1", "Pillar 2", "Pillar 3"]);
  // Lista com outro tamanho (o português mudou depois da tradução): fica em português.
  const velha = mesclarTraducao(CAMPOS.curso, pt, { ...trad, pilares: [{ titulo: "Only one", texto: "x" }] });
  assert.deepEqual(velha.pilares, pt.pilares);
  assert.equal(mesclarTraducao(CAMPOS.curso, pt, null), pt);
});

test("folhas de texto e fotos do conteúdo (o que o editor procura na prévia), com caminho de cada uma", () => {
  const c = conteudoPadrao("inicio", "curso", tr, TEXTOS_PADRAO);
  const folhas = folhasDeTexto(CAMPOS.curso, c);
  assert.ok(folhas.some((f) => f.caminho === "titulo" && f.valor === "Como é a formação" && f.max === 120));
  assert.ok(folhas.some((f) => f.caminho === "pilares.1.titulo"));
  assert.ok(!folhas.some((f) => f.caminho.startsWith("foto")), "a foto não é texto");
  const fotos = fotosDoConteudo(CAMPOS.curso, c);
  assert.equal(fotos.length, 1);
  assert.equal(fotos[0].caminho, "foto");
  assert.equal(fotos[0].proporcao, "retrato");
});

test("valorEm e comValorEm leem e trocam por caminho sem mexer no original", () => {
  const c = { titulo: "A", pilares: [{ titulo: "p1" }, { titulo: "p2" }], foto: { url: "/images/a.webp", alt: "x" } };
  assert.equal(valorEm(c, "pilares.1.titulo"), "p2");
  const n = comValorEm(c, "pilares.1.titulo", "novo");
  assert.equal(valorEm(n, "pilares.1.titulo"), "novo");
  assert.equal(c.pilares[1].titulo, "p2", "o original não muda");
  assert.equal(n.pilares[0], c.pilares[0], "o que não mudou é o mesmo objeto");
  assert.deepEqual(comValorEm(c, "foto", { url: "/images/b.webp", alt: "y" }).foto, { url: "/images/b.webp", alt: "y" });
  assert.equal(valorEm(c, "pilares.5.titulo"), undefined);
});

test("conteúdo igual ignora a ordem das chaves (o jsonb do Postgres reordena)", () => {
  assert.equal(conteudoIgual({ a: 1, b: { c: [1, { x: 1, y: 2 }] } }, { b: { c: [1, { y: 2, x: 1 }] }, a: 1 }), true);
  assert.equal(conteudoIgual({ a: 1 }, { a: 2 }), false);
  assert.equal(conteudoIgual(null, undefined), true);
  assert.equal(conteudoIgual([1, 2], [2, 1]), false, "a ordem da lista conta");
});

test("histórico: digitar seguido no mesmo campo vira um passo; desfazer e refazer; novo passo limpa o refazer", () => {
  let h = iniciarHistoria("a");
  assert.equal(podeDesfazer(h), false);
  h = empurrar(h, "ab", "campo", 1000);
  h = empurrar(h, "abc", "campo", 1000 + 200); // junta
  assert.equal(h.passado.length, 1);
  h = empurrar(h, "abcd", "campo", 1000 + JUNTAR_MS + 500); // passou o tempo: novo passo
  assert.equal(h.passado.length, 2);
  h = empurrar(h, "abcde", "outro", 1000 + JUNTAR_MS + 600); // outro campo: novo passo
  assert.equal(h.passado.length, 3);
  h = desfazer(h);
  assert.equal(h.presente, "abcd");
  assert.ok(podeRefazer(h));
  h = refazer(h);
  assert.equal(h.presente, "abcde");
  h = desfazer(desfazer(h));
  assert.equal(h.presente, "abc");
  h = empurrar(h, "novo");
  assert.equal(podeRefazer(h), false);
  assert.equal(empurrar(h, h.presente), h, "mesmo valor não cria passo");
  assert.equal(desfazer(iniciarHistoria("x")).presente, "x");
});

test("cada tipo de seção tem campos e um schema que aceita o vazio só onde o campo é opcional", () => {
  for (const tipo of Object.keys(CAMPOS) as TipoSecao[]) {
    assert.ok(CAMPOS[tipo].length > 0, tipo);
    assert.equal(validarConteudo(tipo, {}).ok, false, `${tipo}: objeto vazio não vale`);
  }
});
