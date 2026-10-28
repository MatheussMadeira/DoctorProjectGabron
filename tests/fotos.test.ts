import assert from "node:assert/strict";
import { test } from "node:test";
import { FOTO_REGRAS, MENSAGENS_FOTO, ehHeic, recorteEhPequeno, tamanhoDeSaida, tipoAceito } from "../lib/fotos";
import { FOTO_BLOB, fotoValida } from "../lib/turma-form";

test("aceita JPG, PNG, WebP e HEIC/HEIF; recusa o resto", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]) assert.equal(tipoAceito({ type, name: "x" }), true, type);
  for (const type of ["image/gif", "application/pdf", "video/mp4", "image/svg+xml"]) assert.equal(tipoAceito({ type, name: "x.jpg" }), false, type);
});

test("HEIC no Windows chega sem tipo: vale a extensão", () => {
  assert.equal(tipoAceito({ type: "", name: "IMG_0001.HEIC" }), true);
  assert.equal(tipoAceito({ type: "", name: "foto.jpeg" }), true);
  assert.equal(tipoAceito({ type: "", name: "documento.pdf" }), false);
  assert.equal(ehHeic({ type: "image/heic", name: "a" }), true);
  assert.equal(ehHeic({ type: "", name: "a.heif" }), true);
  assert.equal(ehHeic({ type: "image/jpeg", name: "a.jpg" }), false);
});

test("limites: original até 25 MB; arquivo final WebP até 2 MB e 2000 de largura", () => {
  assert.equal(FOTO_REGRAS.maxOriginalBytes, 25 * 1024 * 1024);
  assert.equal(FOTO_REGRAS.maxFinalBytes, 2 * 1024 * 1024);
  assert.equal(FOTO_REGRAS.tipoFinal, "image/webp");
  assert.equal(FOTO_REGRAS.larguraMaxima, 2000);
  assert.equal(FOTO_REGRAS.qualidade, 0.82);
});

test("tamanho de saída: nunca passa de 2000 de largura e é sempre 16:10", () => {
  assert.deepEqual(tamanhoDeSaida(4000), { largura: 2000, altura: 1250 });
  assert.deepEqual(tamanhoDeSaida(2000), { largura: 2000, altura: 1250 });
  assert.deepEqual(tamanhoDeSaida(1600), { largura: 1600, altura: 1000 });
  // Foto pequena não é ampliada.
  assert.deepEqual(tamanhoDeSaida(800), { largura: 800, altura: 500 });
  for (const w of [301, 999, 1234, 2999]) {
    const { largura, altura } = tamanhoDeSaida(w);
    assert.ok(Math.abs(largura / altura - 1.6) < 0.01, `${w}`);
  }
});

test("aviso de foto pequena: abaixo de 1200 de largura do recorte, e só aviso", () => {
  assert.equal(recorteEhPequeno(1199), true);
  assert.equal(recorteEhPequeno(1200), false);
  assert.equal(recorteEhPequeno(3000), false);
  assert.equal(MENSAGENS_FOTO.pequena, "Esta foto é pequena e pode ficar borrada em telas grandes. Usar mesmo assim?");
});

test("mensagens de erro em linguagem simples: sem 16:10, px nem MB", () => {
  for (const [chave, texto] of Object.entries(MENSAGENS_FOTO)) {
    assert.doesNotMatch(texto, /16:10|\bpx\b|pixels?|\bMB\b|megabyte/i, chave);
  }
  assert.equal(MENSAGENS_FOTO.naoAbriu, "Não foi possível abrir esta foto. Tente outra ou tire um print dela.");
});

test("servidor: só a URL do nosso Blob (ou a biblioteca da marca) entra no banco", () => {
  assert.equal(fotoValida("/images/maos.webp"), true);
  assert.equal(fotoValida("https://abc123.public.blob.vercel-storage.com/turma-1-xyz.webp"), true);
  for (const url of ["https://exemplo.invalid/foto.webp", "http://abc.public.blob.vercel-storage.com/a.webp", "https://abc.public.blob.vercel-storage.com.exemplo.invalid/a.webp", "https://abc.private.blob.vercel-storage.com/a.webp", "javascript:alert(1)", ""]) {
    assert.equal(fotoValida(url), false, url);
  }
  assert.ok(FOTO_BLOB.test("https://abc.public.blob.vercel-storage.com/a.webp"));
});
