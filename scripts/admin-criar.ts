/* Cria o primeiro usuário ADMIN (a Dra.). Não existe cadastro público: este script é o único jeito de criar o primeiro.
   Uso: yarn admin:criar          (pergunta nome, e-mail e senha; a senha não aparece na tela)
   Sem terminal interativo, use as variáveis ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA. */
import { Writable } from "node:stream";
import { createInterface } from "node:readline/promises";
import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { usuarios } from "../db/schema";
import { normalizarEmail } from "../lib/login";
import { gerarHash, validarSenha } from "../lib/senha";

let escondido = false;
const saida = new Writable({
  write(chunk, _enc, cb) {
    if (!escondido) process.stdout.write(chunk);
    cb();
  },
});
const rl = createInterface({ input: process.stdin, output: saida, terminal: !!process.stdin.isTTY });

async function perguntar(texto: string, esconder = false) {
  process.stdout.write(texto);
  escondido = esconder;
  const resposta = await rl.question("");
  escondido = false;
  if (esconder) process.stdout.write("\n");
  return resposta.trim();
}

async function main() {
  const interativo = !!process.stdin.isTTY && !process.env.ADMIN_SENHA;
  const nome = process.env.ADMIN_NOME ?? (await perguntar("Nome: "));
  const email = normalizarEmail(process.env.ADMIN_EMAIL ?? (await perguntar("E-mail: ")));
  const senha = process.env.ADMIN_SENHA ?? (await perguntar("Senha (mínimo 12 caracteres): ", true));
  if (interativo) {
    const repetida = await perguntar("Repita a senha: ", true);
    if (repetida !== senha) throw new Error("As senhas não conferem.");
  }

  if (!nome) throw new Error("Informe o nome.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
  const erroSenha = validarSenha(senha);
  if (erroSenha) throw new Error(erroSenha);

  const [existente] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email));
  if (existente) throw new Error(`Já existe um usuário com o e-mail ${email}.`);

  await db.insert(usuarios).values({ nome, email, senhaHash: await gerarHash(senha), papel: "ADMIN", ativo: true });
  console.log(`ADMIN criado: ${nome} <${email}>. Entre em /admin/login.`);
}

main()
  .catch((e) => {
    console.error(`Erro: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await pool.end();
  });
