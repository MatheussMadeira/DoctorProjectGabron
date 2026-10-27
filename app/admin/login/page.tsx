import type { Metadata } from "next";
import { LoginForm } from "@/components/organisms";
import { AdminLoginLayout } from "@/components/templates";
import { entrar } from "./actions";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { de } = await searchParams;
  return (
    <AdminLoginLayout>
      <LoginForm acao={entrar} de={typeof de === "string" ? de : undefined} />
    </AdminLoginLayout>
  );
}
