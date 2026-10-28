"use server";

import { connection } from "next/server";
import { gerarCarimbo } from "./carimbo";

/** O navegador chama ao abrir um formulário público. Server Action: nunca entra no cache nem no HTML estático. */
export async function obterCarimbo(): Promise<string> {
  await connection();
  return gerarCarimbo();
}
