import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginTentativas, usuarios, type Papel } from "@/db/schema";
import { conferirSenha, gerarHash } from "./senha";

/** 5 erros seguidos bloqueiam o e-mail por 15 minutos. */
export const MAX_FALHAS = 5;
export const BLOQUEIO_MINUTOS = 15;

export const normalizarEmail = (email: string) => email.trim().toLowerCase();

export type ResultadoLogin =
  | { ok: true; usuario: { id: string; nome: string; email: string; papel: Papel } }
  | { ok: false; motivo: "invalida" }
  | { ok: false; motivo: "bloqueada"; ate: Date };

// Hash de mentira para gastar o mesmo tempo quando o e-mail não existe (não revela quem tem conta).
let hashFalso: Promise<string> | undefined;

/** Confere e-mail e senha, aplicando o bloqueio. Quem chama nunca diz qual dos dois estava errado. */
export async function verificarCredenciais(emailBruto: string, senha: string): Promise<ResultadoLogin> {
  const email = normalizarEmail(emailBruto);
  if (!email || !senha) return { ok: false, motivo: "invalida" };

  const [tentativa] = await db.select().from(loginTentativas).where(eq(loginTentativas.email, email));
  if (tentativa?.bloqueadoAte && tentativa.bloqueadoAte > new Date()) {
    return { ok: false, motivo: "bloqueada", ate: tentativa.bloqueadoAte };
  }

  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.email, email));
  hashFalso ??= gerarHash("senha-que-nao-existe");
  const senhaCerta = await conferirSenha(senha, usuario?.senhaHash ?? (await hashFalso));

  if (!usuario || !usuario.ativo || !usuario.senhaHash || !senhaCerta) {
    const bloqueada = await registrarFalha(email);
    return bloqueada ? { ok: false, motivo: "bloqueada", ate: bloqueada } : { ok: false, motivo: "invalida" };
  }

  await db.delete(loginTentativas).where(eq(loginTentativas.email, email));
  return { ok: true, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel } };
}

/** Soma uma falha numa única instrução (seguro com tentativas simultâneas). Devolve até quando bloqueou, se bloqueou. */
async function registrarFalha(email: string): Promise<Date | null> {
  const [linha] = await db
    .insert(loginTentativas)
    .values({ email, falhas: 1 })
    .onConflictDoUpdate({
      target: loginTentativas.email,
      set: {
        // Bloqueio que já venceu recomeça a contagem do zero.
        falhas: sql`case
          when ${loginTentativas.bloqueadoAte} is not null and ${loginTentativas.bloqueadoAte} <= now() then 1
          when ${loginTentativas.falhas} + 1 >= ${MAX_FALHAS} then 0
          else ${loginTentativas.falhas} + 1 end`,
        bloqueadoAte: sql`case
          when ${loginTentativas.bloqueadoAte} is not null and ${loginTentativas.bloqueadoAte} <= now() then null
          when ${loginTentativas.falhas} + 1 >= ${MAX_FALHAS} then now() + make_interval(mins => ${BLOQUEIO_MINUTOS})
          else ${loginTentativas.bloqueadoAte} end`,
        atualizadoEm: sql`now()`,
      },
    })
    .returning({ bloqueadoAte: loginTentativas.bloqueadoAte });
  return linha.bloqueadoAte && linha.bloqueadoAte > new Date() ? linha.bloqueadoAte : null;
}
