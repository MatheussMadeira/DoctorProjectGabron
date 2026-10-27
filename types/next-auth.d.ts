import type { DefaultSession } from "next-auth";
import type { Papel } from "@/db/schema";

declare module "next-auth" {
  interface User {
    papel?: Papel;
    lembrar?: boolean;
  }
  interface Session {
    user: { id: string; papel?: Papel } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    papel?: Papel;
    /** Instante (ms) em que a sessão vence: 7 ou 30 dias depois do login. */
    expiraEm?: number;
  }
}
