// Capturas do painel (1440px e 390px). Cria um ADMIN temporário no banco, entra, fotografa e apaga o usuário.
// Uso: node --env-file=.env.local scripts/capturas-admin.mjs <pasta> [url-base]
import { chromium } from "@playwright/test";
import { Pool } from "@neondatabase/serverless";
import { hash } from "@node-rs/argon2";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const saida = process.argv[2] ?? "capturas/admin";
const base = process.argv[3] ?? "http://localhost:3107";
mkdirSync(saida, { recursive: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const email = `captura-${Date.now()}@exemplo.invalid`;
const senha = "senha-de-captura-123";
await pool.query("insert into usuarios (nome, email, papel, senha_hash) values ($1, $2, 'ADMIN', $3)", ["Dra. Ana Paula (teste)", email, await hash(senha)]);

const browser = await chromium.launch();
try {
  for (const [vn, viewport] of [["1440", { width: 1440, height: 900 }], ["390", { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", locale: "pt-BR" });
    const page = await ctx.newPage();
    const foto = (nome, opcoes = {}) => page.screenshot({ path: join(saida, `${nome}-${vn}.png`), ...opcoes });

    await page.goto(base + "/admin/login", { waitUntil: "networkidle" });
    await foto("login", { fullPage: true });
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("senha-errada-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.getByText("E-mail ou senha incorretos").waitFor();
    await foto("login-erro", { fullPage: true });

    await page.getByLabel("Senha").fill(senha);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/admin$/);
    await page.waitForLoadState("networkidle");
    await foto("painel", { fullPage: true });

    await page.goto(base + "/admin/agenda", { waitUntil: "networkidle" });
    await foto("agenda", { fullPage: true });
    await page.getByRole("button", { name: /^Excluir: Aplicação avançada/ }).click();
    await page.waitForTimeout(300);
    await foto("agenda-excluir");
    await page.keyboard.press("Escape");

    const editar = page.getByRole("link", { name: /^Editar:/ }).nth(1);
    await page.goto(await editar.evaluate((a) => a.href), { waitUntil: "networkidle" });
    await foto("editar", { fullPage: true });
    await page.getByRole("button", { name: "Trocar foto" }).click();
    await page.waitForTimeout(2000);
    await foto("editar-foto");
    await page.keyboard.press("Escape");

    await page.goto(base + "/admin/configuracoes", { waitUntil: "networkidle" });
    await foto("configuracoes", { fullPage: true });
    await page.goto(base + "/admin/inscricoes", { waitUntil: "networkidle" });
    await foto("inscricoes", { fullPage: true });
    await ctx.close();
  }
} finally {
  await browser.close();
  await pool.query("delete from login_tentativas where email = $1", [email]);
  await pool.query("delete from usuarios where email = $1", [email]);
  await pool.end();
}
console.log("ok", saida);
