import assert from "node:assert/strict";
import { test } from "node:test";
import { ALTURA_MINIMA_DA_LETRA_DA_LINHA_PX, ALTURA_MINIMA_DO_SIMBOLO_PX, alturaDoSimboloPx, larguraMinimaDaLinha, resolverLogo } from "../components/atoms/Logo";

test("linha de apoio: só aparece quando a letra tem 11 px ou mais; abaixo disso, versão sem a linha", () => {
  assert.equal(ALTURA_MINIMA_DA_LETRA_DA_LINHA_PX, 11);
  const minimaVertical = larguraMinimaDaLinha("vertical");
  assert.ok(minimaVertical > 300 && minimaVertical < 450, `largura mínima da vertical: ${minimaVertical}`);

  // Rodapé: 210 px (desktop) e 180 px (celular) ficam sem a linha, e sem o espaço dela.
  for (const largura of [210, 180]) {
    const r = resolverLogo("vertical", largura);
    assert.equal(r.semLinha, true, `${largura}px`);
    assert.equal(r.variant, "vertical");
    assert.notEqual(r.vb, "0 -262 608 310");
    assert.ok(Number(r.vb.split(" ")[3]) < 310, "o viewBox perde a altura da linha");
  }
  // Grande o bastante: com a linha.
  assert.deepEqual(resolverLogo("vertical", Math.ceil(minimaVertical)), { variant: "vertical", vb: "0 -262 608 310", semLinha: false });
  assert.equal(resolverLogo("vertical", minimaVertical - 1).semLinha, true);
  // Sem largura em número (tamanho por CSS): mantém a pedida.
  assert.equal(resolverLogo("vertical", "100%").semLinha, false);
  assert.equal(resolverLogo("vertical").semLinha, false);
});

test("a horizontal sem espaço para a linha vira a compacta; as outras variantes não mudam", () => {
  assert.equal(resolverLogo("horizontal", 220).variant, "compacta");
  assert.equal(resolverLogo("horizontal", 220).semLinha, true);
  assert.equal(resolverLogo("horizontal", Math.ceil(larguraMinimaDaLinha("horizontal"))).variant, "horizontal");
  for (const v of ["compacta", "selo", "simbolo"] as const) {
    assert.equal(resolverLogo(v, 60).semLinha, false, v);
    assert.equal(resolverLogo(v, 60).variant, v, v);
  }
});

test("símbolo com no mínimo 24 px de altura: compacta a partir de 140 px (Header no celular), 150 (painel), 180 e 158 (Header no desktop)", () => {
  assert.equal(ALTURA_MINIMA_DO_SIMBOLO_PX, 24);
  for (const largura of [140, 150, 158, 180]) {
    const h = alturaDoSimboloPx("compacta", largura);
    assert.ok(h >= 24, `${largura}px → símbolo de ${h.toFixed(1)}px`);
  }
  // O símbolo avulso e o vertical do rodapé também passam com folga.
  assert.ok(alturaDoSimboloPx("vertical", 180) >= 24);
  assert.ok(alturaDoSimboloPx("simbolo", 36) >= 24, "o ícone do menu do celular (36 px de largura)");
});
