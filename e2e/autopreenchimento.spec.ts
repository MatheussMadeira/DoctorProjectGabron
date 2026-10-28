import { expect, test, type Page, type Route } from "@playwright/test";
import { eq, inArray, like, sql } from "drizzle-orm";
import { db } from "../db";
import { formulariosDescartes, inscricoes, mensagensContato, turmas } from "../db/schema";
import { gerarCarimbo, IDADE_MAXIMA_MS, verificarCarimbo } from "../lib/carimbo";

/* Autopreenchimento do Chrome nos formulários públicos.
   O bug: o campo-armadilha se chamava "website"; o Chrome o preencheu sozinho e a pessoa real recebeu "Mensagem enviada"
   sem que nada fosse gravado. Aqui os formulários são preenchidos como o autopreenchimento faz (todo campo com nome
   reconhecível ganha valor, sem ninguém digitar) e a mensagem e a inscrição têm de ser gravadas.
   Cada teste usa o seu IP (x-forwarded-for), para o limite por visitante de um não atrapalhar o outro. */

const marca = `${Date.now()}`;
const slugs: string[] = [];
let contador = 0;

const emailDoTeste = (n: string) => `e2e-auto-${marca}-${n}@exemplo.invalid`;

async function comIp(page: Page, ultimo: number) {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.77.${Number(marca.slice(-3)) % 250}.${ultimo}` });
}

async function novaTurma() {
  const n = ++contador;
  const slug = `teste-e2e-auto-${marca}-${n}`;
  await db.insert(turmas).values({
    slug, titulo: `Turma autopreenchimento ${n}`, tituloCurto: `Auto ${n}`, resumo: "Teste", descricao: "Teste", modalidade: "PRESENCIAL", publicacao: "PUBLICADO",
    inicio: "2099-03-14", horario: "8h às 18h", cidade: "Belo Horizonte, MG", vagas: 5, fotoUrl: "/images/maos.webp", fotoAlt: "Teste",
  });
  slugs.push(slug);
  return slug;
}

test.afterAll(async () => {
  if (slugs.length) {
    const ts = await db.select({ id: turmas.id }).from(turmas).where(inArray(turmas.slug, slugs));
    const ids = ts.map((t) => t.id);
    if (ids.length) {
      await db.delete(inscricoes).where(inArray(inscricoes.turmaId, ids));
      await db.delete(turmas).where(inArray(turmas.id, ids));
    }
  }
  await db.delete(mensagensContato).where(like(mensagensContato.email, `e2e-auto-${marca}-%`));
});

/** Valores que o autopreenchimento do Chrome usa para cada nome/autocomplete de campo (inclusive os que o formulário nem pede). */
const PERFIL = (email: string): Record<string, string> => ({
  name: "Maria da Silva", nome: "Maria da Silva", "given-name": "Maria", "family-name": "Silva",
  email, "e-mail": email, mail: email,
  telefone: "(31) 91234-5678", tel: "(31) 91234-5678", phone: "(31) 91234-5678", celular: "(31) 91234-5678",
  website: "https://www.exemplo.invalid", site: "https://www.exemplo.invalid", url: "https://www.exemplo.invalid", homepage: "https://www.exemplo.invalid",
  company: "Clínica Exemplo", empresa: "Clínica Exemplo", organization: "Clínica Exemplo", organizacao: "Clínica Exemplo",
  address: "Rua Exemplo, 100", endereco: "Rua Exemplo, 100", city: "Belo Horizonte", cidade: "Belo Horizonte", cep: "30000-000", "postal-code": "30000-000",
  registro: "12345 / MG", assunto: "", mensagem: "Gostaria de agendar uma consulta.",
});

/**
 * Imita o autopreenchimento: percorre todo campo do formulário e, se o nome (ou o atributo autocomplete) é reconhecível,
 * preenche e dispara os mesmos eventos do navegador. Devolve os nomes que ficaram de fora (os que o Chrome não reconhece).
 */
async function autopreencher(page: Page, formulario: string, email: string): Promise<string[]> {
  const perfil = PERFIL(email);
  return page.locator(formulario).evaluate((form, perfil) => {
    const naoReconhecidos: string[] = [];
    for (const el of Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"))) {
      if (el.type === "hidden" || el.type === "checkbox" || el.type === "submit") continue;
      const chaves = [el.name, el.getAttribute("autocomplete") ?? "", el.id].map((c) => c.toLowerCase());
      const chave = chaves.find((c) => c in perfil);
      if (!chave || el.getAttribute("autocomplete") === "off") {
        naoReconhecidos.push(el.name);
        continue;
      }
      const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
      set.call(el, perfil[chave]);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return naoReconhecidos;
  }, perfil);
}

async function esperarFormulario(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator('input[name="carimbo_form"]')).not.toHaveValue("", { timeout: 15_000 });
  await page.waitForTimeout(2200); // mínimo de 2 s de página aberta
}

test("contato com autopreenchimento: a mensagem é gravada, e o campo-armadilha não é tocado", async ({ page }) => {
  await comIp(page, 1);
  await page.goto("/contato");
  await esperarFormulario(page);
  const email = emailDoTeste("contato");

  const deFora = await autopreencher(page, "form", email);
  expect(deFora).toEqual(["campo_hp_7k"]); // só a armadilha ficou sem valor: nenhum nome reconhecível
  await expect(page.locator('input[name="campo_hp_7k"]')).toHaveValue("");

  await page.locator('select[name="assunto"]').selectOption("Inscrições e turmas");
  await expect(async () => {
    await page.getByLabel(/Li e aceito a Política de Privacidade/).check({ force: true, timeout: 2000 });
  }).toPass();
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada")).toBeVisible();

  const [msg] = await db.select().from(mensagensContato).where(eq(mensagensContato.email, email));
  expect(msg).toBeTruthy();
  expect(msg.nome).toBe("Maria da Silva");
});

test("inscrição com autopreenchimento: a inscrição é gravada, e o campo-armadilha não é tocado", async ({ page }) => {
  await comIp(page, 2);
  const slug = await novaTurma();
  await page.goto(`/agenda/${slug}`);
  await esperarFormulario(page);
  const email = emailDoTeste("inscricao");

  const deFora = await autopreencher(page, "form", email);
  expect(deFora).toEqual(["campo_hp_7k"]);
  await expect(page.locator('input[name="campo_hp_7k"]')).toHaveValue("");

  await page.locator('select[name="profissao"]').selectOption("Médico(a)");
  await page.locator('select[name="conselho"]').selectOption("CRM");
  await expect(async () => {
    await page.getByLabel(/Li e aceito a Política de Privacidade/).check({ force: true, timeout: 2000 });
  }).toPass();
  await page.getByRole("button", { name: "Enviar inscrição" }).click();
  await expect(page.getByText("Enviamos os próximos passos para o seu e-mail")).toBeVisible();

  const [ins] = await db.select().from(inscricoes).where(eq(inscricoes.email, email));
  expect(ins).toBeTruthy();
  expect(ins.telefone).toBe("(31) 91234-5678");
});

test("campo-armadilha: nome sem sentido, sem sugestão de autopreenchimento, fora da tela e fora do foco", async ({ page }) => {
  await page.goto("/contato");
  const campo = page.locator('input[name="campo_hp_7k"]');
  await expect(campo).toHaveAttribute("autocomplete", "off");
  await expect(campo).toHaveAttribute("data-lpignore", "true");
  await expect(campo).toHaveAttribute("tabindex", "-1");
  await expect(campo).not.toHaveAttribute("type", "hidden");
  await expect(page.locator('[aria-hidden="true"]:has(input[name="campo_hp_7k"])')).toHaveCount(1);
  const caixa = await campo.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, visibility: getComputedStyle(el).visibility, display: getComputedStyle(el).display };
  });
  expect(caixa.x).toBeLessThan(-5000);
  expect(caixa.display).not.toBe("none");
  // Nenhum campo do formulário tem nome que o navegador sabe preencher sozinho, exceto os que a pessoa vê.
  expect(await campo.evaluate((el: HTMLInputElement) => el.labels?.[0]?.textContent ?? "")).not.toMatch(/nome|e-?mail|telefone|site|empresa|endere/i);
});

test("envio rápido demais: aviso de verdade (nunca falso sucesso), nada gravado, e o que foi digitado fica", async ({ page }) => {
  await comIp(page, 3);
  // Segura o pedido do carimbo até o formulário estar preenchido: assim o carimbo nasce no instante do envio (menos de 2 s).
  let segurado: Route | null = null;
  let primeiro = true;
  await page.route("**/contato", async (route) => {
    if (route.request().method() === "POST" && primeiro) {
      primeiro = false;
      segurado = route;
      return;
    }
    await route.continue();
  });
  await page.goto("/contato"); // sem esperar "networkidle": o pedido do carimbo fica pendente de propósito
  await expect.poll(() => segurado !== null, { timeout: 15_000 }).toBe(true);
  const email = emailDoTeste("rapido");

  await autopreencher(page, "form", email);
  await page.locator('select[name="assunto"]').selectOption("Inscrições e turmas");
  await expect(async () => {
    await page.getByLabel(/Li e aceito a Política de Privacidade/).check({ force: true, timeout: 2000 });
  }).toPass();
  await (segurado as unknown as Route).continue();
  await expect(page.locator('input[name="carimbo_form"]')).not.toHaveValue("", { timeout: 15_000 });
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Você enviou rápido demais. Aguarde um instante e envie de novo.")).toBeVisible();
  await expect(page.getByText("Mensagem enviada")).toHaveCount(0);
  expect(await db.select().from(mensagensContato).where(eq(mensagensContato.email, email))).toHaveLength(0);
  await expect(page.locator('input[name="email"]')).toHaveValue(email); // o que foi digitado fica
  await expect(page.locator('select[name="assunto"]')).toHaveValue("Inscrições e turmas");
  await expect(page.getByLabel(/Li e aceito a Política de Privacidade/)).toBeChecked();

  // Passado o mínimo, o mesmo formulário envia.
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada")).toBeVisible();
  expect(await db.select().from(mensagensContato).where(eq(mensagensContato.email, email))).toHaveLength(1);
});

test("sem carimbo (envio direto): pede para recarregar, não grava e não dá falso sucesso", async ({ page }) => {
  await comIp(page, 4);
  await page.goto("/contato");
  await esperarFormulario(page);
  const email = emailDoTeste("semcarimbo");
  await autopreencher(page, "form", email);
  await page.locator('select[name="assunto"]').selectOption("Inscrições e turmas");
  await expect(async () => {
    await page.getByLabel(/Li e aceito a Política de Privacidade/).check({ force: true, timeout: 2000 });
  }).toPass();
  await page.locator('input[name="carimbo_form"]').evaluate((el: HTMLInputElement) => (el.value = "1234567890123.adulterado"));
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Não foi possível validar o envio. Recarregue a página e tente de novo.")).toBeVisible();
  expect(await db.select().from(mensagensContato).where(eq(mensagensContato.email, email))).toHaveLength(0);
});

test("campo-armadilha preenchido (robô): parece sucesso, nada é gravado, e o descarte é contado", async ({ page }) => {
  await comIp(page, 5);
  const contar = async () => {
    const [r] = await db
      .select({ n: sql<number>`coalesce(sum(${formulariosDescartes.contagem}), 0)::int` })
      .from(formulariosDescartes)
      .where(sql`${formulariosDescartes.motivo} = 'ARMADILHA' and ${formulariosDescartes.formulario} = 'contato'`);
    return r.n;
  };
  const antes = await contar();
  await page.goto("/contato");
  await esperarFormulario(page);
  const email = emailDoTeste("robo");
  await autopreencher(page, "form", email);
  await page.locator('select[name="assunto"]').selectOption("Inscrições e turmas");
  await expect(async () => {
    await page.getByLabel(/Li e aceito a Política de Privacidade/).check({ force: true, timeout: 2000 });
  }).toPass();
  await page.locator('input[name="campo_hp_7k"]').evaluate((el: HTMLInputElement) => (el.value = "spam"));
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada")).toBeVisible();
  expect(await db.select().from(mensagensContato).where(eq(mensagensContato.email, email))).toHaveLength(0);
  await expect.poll(contar).toBe(antes + 1);
});

test("limite de envios: o aviso é honesto, nunca falso sucesso", async ({ page }) => {
  await comIp(page, 6);
  await page.goto("/contato");
  await esperarFormulario(page);
  for (let i = 1; i <= 3; i++) {
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText(/Revise \d+ campos? antes de enviar/)).toBeVisible();
  }
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Muitas tentativas, tente de novo em alguns minutos.")).toBeVisible();
  await expect(page.getByText("Mensagem enviada")).toHaveCount(0);
});

const HORAS = 60 * 60 * 1000;

test("aba aberta de um dia para o outro: carimbo vencido é renovado e reenviado sozinho, sem nenhum erro na tela", async ({ page }) => {
  await comIp(page, 7);
  await page.goto("/contato");
  await esperarFormulario(page);
  const email = emailDoTeste("overnight");

  await autopreencher(page, "form", email);
  await page.locator('select[name="assunto"]').selectOption("Inscrições e turmas");
  await expect(async () => {
    await page.getByLabel(/Li e aceito a Política de Privacidade/).check({ force: true, timeout: 2000 });
  }).toPass();

  // "Ontem": o carimbo da aba é de 13 horas atrás (assinado de verdade, só que velho).
  const velho = gerarCarimbo(Date.now() - 13 * HORAS);
  expect(verificarCarimbo(velho)).toBe("expirado");
  await page.locator('input[name="carimbo_form"]').evaluate((el: HTMLInputElement, v) => (el.value = v), velho);

  // Registra tudo o que aparece na tela durante o envio: nenhum aviso pode surgir.
  await page.evaluate(() => {
    const vistos: string[] = [];
    (window as unknown as { __vistos: string[] }).__vistos = vistos;
    new MutationObserver(() => {
      const t = document.body.innerText;
      for (const aviso of ["Não foi possível validar", "rápido demais", "Recarregue a página", "Revise"]) if (t.includes(aviso)) vistos.push(aviso);
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  });

  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Mensagem enviada")).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => (window as unknown as { __vistos: string[] }).__vistos)).toEqual([]);

  // Gravou uma vez só (o primeiro envio foi barrado antes de gravar; o reenvio gravou).
  const msgs = await db.select().from(mensagensContato).where(eq(mensagensContato.email, email));
  expect(msgs).toHaveLength(1);
  expect(msgs[0].nome).toBe("Maria da Silva");
});

test("inscrição com a aba aberta de um dia para o outro: também renova e grava", async ({ page }) => {
  await comIp(page, 8);
  const slug = await novaTurma();
  await page.goto(`/agenda/${slug}`);
  await esperarFormulario(page);
  const email = emailDoTeste("overnight-insc");

  await autopreencher(page, "form", email);
  await page.locator('select[name="profissao"]').selectOption("Médico(a)");
  await page.locator('select[name="conselho"]').selectOption("CRM");
  await expect(async () => {
    await page.getByLabel(/Li e aceito a Política de Privacidade/).check({ force: true, timeout: 2000 });
  }).toPass();
  await page.locator('input[name="carimbo_form"]').evaluate((el: HTMLInputElement, v) => (el.value = v), gerarCarimbo(Date.now() - IDADE_MAXIMA_MS - HORAS));
  await page.getByRole("button", { name: "Enviar inscrição" }).click();
  await expect(page.getByText("Enviamos os próximos passos para o seu e-mail")).toBeVisible({ timeout: 20_000 });
  expect(await db.select().from(inscricoes).where(eq(inscricoes.email, email))).toHaveLength(1);
});

test("voltar à aba depois de muito tempo renova o carimbo sozinho (visibilitychange)", async ({ page }) => {
  await page.goto("/contato");
  await esperarFormulario(page);
  const campo = page.locator('input[name="carimbo_form"]');

  // Carimbo recente: voltar à aba não troca nada.
  const recente = await campo.inputValue();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(800);
  expect(await campo.inputValue()).toBe(recente);

  // Carimbo de ontem: ao voltar, a aba pede um novo.
  const velho = gerarCarimbo(Date.now() - 13 * HORAS);
  await campo.evaluate((el: HTMLInputElement, v) => (el.value = v), velho);
  // O hook compara com o carimbo que ele guardou; força a leitura do valor antigo trocando o estado pelo caminho real:
  // recarrega a página com o relógio do navegador adiantado em 13 horas, como se a aba tivesse ficado aberta.
  await page.clock.install();
  await page.clock.fastForward(13 * HORAS);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(async () => {
    const novo = await campo.inputValue();
    expect(novo).not.toBe(recente);
    expect(novo).not.toBe(velho);
  }).toPass({ timeout: 10_000 });
  // O novo é um carimbo do servidor, válido (recente).
  expect(["rapido", "ok"]).toContain(verificarCarimbo(await campo.inputValue(), Date.now() + 3000));
});
