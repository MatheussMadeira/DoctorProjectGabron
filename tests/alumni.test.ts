import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { alumniSchema, alumniTurmaSchema } from "../lib/alumni-form";
import { ESTADOS, estadoPorCodarea, estadoPorSigla, SIGLAS_UF } from "../lib/brasil";
import { consultaDeCidade } from "../lib/geocodificar";
import { interpretarVideo, legendaValida } from "../lib/video";
import { protegerMarca, restaurarMarca } from "../lib/i18n/deepl";

/* Alumni: vídeo, estados do mapa, validação do cadastro e a marca que não se traduz. */

test("vídeo: YouTube, Vimeo e arquivo são aceitos; qualquer outro endereço não vira iframe", () => {
  assert.deepEqual(interpretarVideo("https://www.youtube.com/watch?v=jNQXAC9IVRw"), { tipo: "youtube", embed: "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw" });
  assert.deepEqual(interpretarVideo("https://youtu.be/jNQXAC9IVRw?t=10"), { tipo: "youtube", embed: "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw" });
  assert.deepEqual(interpretarVideo("https://m.youtube.com/shorts/jNQXAC9IVRw"), { tipo: "youtube", embed: "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw" });
  assert.deepEqual(interpretarVideo("https://vimeo.com/76979871"), { tipo: "vimeo", embed: "https://player.vimeo.com/video/76979871" });
  assert.deepEqual(interpretarVideo("https://player.vimeo.com/video/76979871?h=abc"), { tipo: "vimeo", embed: "https://player.vimeo.com/video/76979871" });
  assert.deepEqual(interpretarVideo("https://res.cloudinary.com/demo/video/upload/v1/reabtoxin/alumni/a.mp4"), { tipo: "arquivo", src: "https://res.cloudinary.com/demo/video/upload/v1/reabtoxin/alumni/a.mp4" });
  assert.deepEqual(interpretarVideo("https://exemplo.com/videos/depoimento.webm"), { tipo: "arquivo", src: "https://exemplo.com/videos/depoimento.webm" });
  for (const ruim of ["", "   ", "http://www.youtube.com/watch?v=jNQXAC9IVRw", "https://youtube.com/watch?v=curto", "https://vimeo.com/abc", "https://evil.example/pagina", "javascript:alert(1)", "youtube.com/watch?v=jNQXAC9IVRw"]) {
    assert.equal(interpretarVideo(ruim), null, ruim);
  }
  assert.equal(legendaValida(""), true);
  assert.equal(legendaValida("https://exemplo.com/legenda.vtt"), true);
  assert.equal(legendaValida("https://exemplo.com/legenda.srt"), false);
  assert.equal(legendaValida("http://exemplo.com/legenda.vtt"), false);
});

test("estados: 27 siglas e cada área do mapa do IBGE tem o seu estado", () => {
  assert.equal(ESTADOS.length, 27);
  assert.equal(new Set(SIGLAS_UF).size, 27);
  assert.equal(estadoPorSigla("mg")?.nome, "Minas Gerais");
  const mapa = JSON.parse(readFileSync("public/mapas/brasil-estados.geojson", "utf8")) as { features: Array<{ properties: { codarea: string } }> };
  assert.equal(mapa.features.length, 27);
  for (const f of mapa.features) assert.ok(estadoPorCodarea(f.properties.codarea), `sem estado para o código ${f.properties.codarea}`);
});

test("validação do aluno: nome obrigatório, UF por sigla, coordenadas em par e datas no formato certo", () => {
  const ok = alumniSchema.safeParse({ nome: "Maria da Silva", profissao: "Dentista", cidade: "Recife", uf: "pe", pais: "br", latitude: "-8,0476", longitude: "-34.877", autorizacaoRecebidaEm: "2026-10-01" });
  assert.ok(ok.success);
  if (ok.success) {
    assert.equal(ok.data.uf, "PE");
    assert.equal(ok.data.pais, "BR");
    assert.equal(ok.data.latitude, -8.0476);
    assert.equal(ok.data.longitude, -34.877);
  }
  assert.equal(alumniSchema.safeParse({ nome: "" }).success, false);
  assert.equal(alumniSchema.safeParse({ nome: "Ana", uf: "XX" }).success, false);
  assert.equal(alumniSchema.safeParse({ nome: "Ana", latitude: "99" }).success, false);
  assert.equal(alumniSchema.safeParse({ nome: "Ana", autorizacaoRecebidaEm: "01/10/2026" }).success, false);
  assert.equal(alumniSchema.safeParse({ nome: "Ana", pais: "BRA" }).success, false);
  const vazio = alumniSchema.safeParse({ nome: "Ana" });
  assert.ok(vazio.success && vazio.data.uf === null && vazio.data.pais === "BR" && vazio.data.latitude === null);
});

test("validação da turma realizada: vídeo só de fontes conhecidas, número de alunos e datas", () => {
  const base = { titulo: "Turma de agosto" };
  assert.ok(alumniTurmaSchema.safeParse({ ...base, videoUrl: "https://youtu.be/jNQXAC9IVRw", numeroAlunos: "14", dataInicio: "2026-08-15" }).success);
  assert.equal(alumniTurmaSchema.safeParse({ ...base, videoUrl: "https://evil.example/x" }).success, false);
  assert.equal(alumniTurmaSchema.safeParse({ ...base, numeroAlunos: "muitos" }).success, false);
  assert.equal(alumniTurmaSchema.safeParse({ ...base, videoLegendaUrl: "https://exemplo.com/a.srt" }).success, false);
  assert.equal(alumniTurmaSchema.safeParse({ titulo: "" }).success, false);
});

test("a consulta de cidade usa o Brasil por padrão", () => {
  assert.equal(consultaDeCidade("Recife", "PE", "BR"), "Recife, PE, Brasil");
  assert.equal(consultaDeCidade("Lisboa", null, "PT"), "Lisboa, PT");
});

test("a marca 'Alumni ReabToxin' vai inteira para a DeepL como texto protegido (não se traduz)", () => {
  assert.equal(protegerMarca("Conheça a Alumni ReabToxin hoje"), "Conheça a <x>Alumni ReabToxin</x> hoje");
  assert.equal(protegerMarca("Curso ReabToxin"), "Curso <x>ReabToxin</x>");
  assert.equal(restaurarMarca(protegerMarca("Alumni ReabToxin & amigos")), "Alumni ReabToxin & amigos");
});
