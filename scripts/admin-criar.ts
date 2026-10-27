/* Cria o primeiro usuário ADMIN (a Dra.). Não existe cadastro público: este script é o único jeito de criar o primeiro.
   Uso: yarn admin:criar          (pergunta nome, e-mail e senha; a senha não aparece na tela)
   Sem terminal interativo, use as variáveis ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA,
   ou entregue as linhas pela entrada padrão (nome, e-mail, senha, repetição). */
import { createInterface } from "node:readline";
import { createInterface as createInterfacePromises } from "node:readline/promises";
import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { usuarios } from "../db/schema";
import { normalizarEmail } from "../lib/login";
import { gerarHash, validarSenha } from "../lib/senha";

const comTerminal = !!process.stdin.isTTY && !!process.stdout.isTTY;

/** Sem terminal (entrada redirecionada): um único leitor de linhas, para não perder linhas já recebidas. */
let linhas: AsyncIterator<string> | undefined;
async function proximaLinha(): Promise<string> {
  linhas ??= createInterface({ input: process.stdin })[Symbol.asyncIterator]();
  const { value } = await linhas.next();
  return String(value ?? "").trim();
}

async function perguntar(texto: string): Promise<string> {
  if (!comTerminal) {
    process.stdout.write(texto);
    return proximaLinha();
  }
  // O texto vai dentro de question(): no terminal o readline redesenha a linha ao começar, e um texto escrito
  // antes por process.stdout.write seria apagado (a pergunta sumia e o script parecia travado).
  const rl = createInterfacePromises({ input: process.stdin, output: process.stdout });
  const resposta = await rl.question(texto);
  rl.close();
  return resposta.trim();
}

/** Lê a senha sem mostrar nada na tela (modo "raw" do terminal). Backspace apaga; Ctrl+C cancela. */
async function perguntarSenha(texto: string): Promise<string> {
  process.stdout.write(texto);
  if (!comTerminal) return proximaLinha();
  return new Promise((resolve) => {
    const entrada = process.stdin;
    let digitado = "";
    const terminar = (valor: string) => {
      entrada.off("data", aoReceber);
      entrada.setRawMode(false);
      entrada.pause();
      process.stdout.write("\n");
      resolve(valor);
    };
    const aoReceber = (dados: string) => {
      for (const c of dados) {
        if (c === "\r" || c === "\n" || c === "\u0004") return terminar(digitado);
        if (c === "\u0003") {
          process.stdout.write("\n");
          process.exit(130);
        }
        if (c === "\u007f" || c === "\b") digitado = digitado.slice(0, -1);
        else if (c >= " ") digitado += c;
      }
    };
    entrada.setEncoding("utf8");
    entrada.setRawMode(true);
    entrada.resume();
    entrada.on("data", aoReceber);
  });
}

/** Mostra em qual banco o ADMIN vai ser criado (só o host, nunca usuário ou senha). */
function bancoDeDestino() {
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "(DATABASE_URL inválida)";
  }
}

async function main() {
  console.log(`Banco de destino: ${bancoDeDestino()}`);
  const nome = process.env.ADMIN_NOME ?? (await perguntar("Nome: "));
  const email = normalizarEmail(process.env.ADMIN_EMAIL ?? (await perguntar("E-mail: ")));
  const deAmbiente = process.env.ADMIN_SENHA !== undefined;
  const senha = process.env.ADMIN_SENHA ?? (await perguntarSenha("Senha (mínimo 12 caracteres): "));
  if (!deAmbiente) {
    const repetida = await perguntarSenha("Repita a senha: ");
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
    process.stdin.pause();
    await pool.end();
  });
