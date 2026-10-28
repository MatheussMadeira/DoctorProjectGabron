"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export interface EstadoLogin {
  erro?: "invalida" | "bloqueada";
  email?: string;
}

/** Só volta para dentro do painel (nunca para um endereço de fora). */
const destinoSeguro = (de: string) => (/^\/admin(\/|$|\?)/.test(de) && !de.startsWith("//") ? de : "/admin");

export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "");
  try {
    await signIn("credentials", {
      email,
      senha: String(formData.get("senha") ?? ""),
      lembrar: formData.get("lembrar") ? "on" : "",
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { erro: (e as AuthError & { code?: string }).code === "bloqueada" ? "bloqueada" : "invalida", email };
    }
    throw e;
  }
  redirect(destinoSeguro(String(formData.get("de") ?? "")));
}

export async function sair() {
  await signOut({ redirectTo: "/admin/login" });
}
