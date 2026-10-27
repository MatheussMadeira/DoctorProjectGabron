import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verificarCredenciais } from "@/lib/login";

/** Login recusado porque o e-mail passou de 5 tentativas erradas. */
export class LoginBloqueado extends CredentialsSignin {
  code = "bloqueada";
}

const DIA = 24 * 60 * 60 * 1000;
/** Sessão normal: 7 dias. Com "Manter conectada": 30 dias. */
export const SESSAO_PADRAO_MS = 7 * DIA;
export const SESSAO_LEMBRADA_MS = 30 * DIA;

/* Sessão em JWT (o provider Credentials não usa sessão em banco). O cookie vive 30 dias, o máximo;
   quem vale é `expiraEm`, gravada no login: 7 ou 30 dias conforme "Manter conectada".
   O papel dentro do token serve só para a interface. Cada Server Action relê usuário, papel e `ativo` do banco. */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, senha: {}, lembrar: {} },
      async authorize(credenciais) {
        const r = await verificarCredenciais(String(credenciais?.email ?? ""), String(credenciais?.senha ?? ""));
        if (!r.ok) {
          if (r.motivo === "bloqueada") throw new LoginBloqueado();
          return null;
        }
        return { id: r.usuario.id, name: r.usuario.nome, email: r.usuario.email, papel: r.usuario.papel, lembrar: credenciais?.lembrar === "on" };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: SESSAO_LEMBRADA_MS / 1000 },
  pages: { signIn: "/admin/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.papel = user.papel;
        token.expiraEm = Date.now() + (user.lembrar ? SESSAO_LEMBRADA_MS : SESSAO_PADRAO_MS);
      }
      // Passou do prazo escolhido no login: encerra a sessão.
      if (typeof token.expiraEm === "number" && Date.now() > token.expiraEm) return null;
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      if (token.papel) session.user.papel = token.papel as "ADMIN" | "EQUIPE";
      return session;
    },
  },
});
