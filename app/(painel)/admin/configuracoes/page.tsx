import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { ConfiguracoesTabs } from "@/components/molecules";
import { DadosClinicaForm, EmailDeTeste, TrocarSenhaForm, UsuariosAdmin } from "@/components/organisms";
import { GaleriaAdmin } from "@/components/organisms/GaleriaAdmin";
import { ProfessoresAdmin } from "@/components/organisms/ProfessoresAdmin";
import { listarDepoimentosAdmin, listarGaleriaAdmin, listarProfessoresAdmin } from "@/lib/admin-professores";
import { BLOCOS, lerBlocosEmPortugues, type Bloco } from "@/lib/textos-curso";
import { CursoAdmin } from "@/components/organisms/CursoAdmin";
import { DepoimentosAdmin } from "@/components/organisms/DepoimentosAdmin";
import { dadosDeTraducao, type DadosDeTraducao } from "@/lib/i18n/admin";
import { TraducoesAdmin } from "@/components/organisms/TraducoesAdmin";
import { lerLinhaConfiguracoes } from "@/lib/configuracoes";
import { lerConfig } from "@/lib/email/config";
import { destinatariosDaEquipe } from "@/lib/email/destinatarios";
import { pode } from "@/lib/permissoes";
import { exigirSessao } from "@/lib/sessao";
import { SITE_PADRAO } from "@/lib/site";
import { alterarPapelUsuario, alternarUsuarioAtivo, criarUsuario, redefinirSenhaUsuario, trocarMinhaSenha } from "../acoes-usuario";
import { enviarEmailDeTeste, salvarConfiguracoes } from "../acoes-config";
import { PaginaAdmin } from "../pagina";
import styles from "@/components/admin.module.css";

export const metadata: Metadata = { title: "Configurações" };

const ABAS = ["professores", "galeria", "curso", "contato", "usuarios"] as const;
type Aba = (typeof ABAS)[number];

export default async function ConfiguracoesPage({ searchParams }: PageProps<"/admin/configuracoes">) {
  const [usuario, params] = await Promise.all([exigirSessao(), searchParams]);
  const pedida = String(params.aba ?? "");
  const aba: Aba = (ABAS as readonly string[]).includes(pedida) ? (pedida as Aba) : "professores";
  const admin = pode(usuario.papel, "usuario:gerir");

  const [lista, linha, avisosPara, profs, galeria] = admin
    ? await Promise.all([
        aba === "usuarios" ? db.select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, papel: usuarios.papel, ativo: usuarios.ativo }).from(usuarios).orderBy(asc(usuarios.nome)) : Promise.resolve([]),
        aba === "contato" ? lerLinhaConfiguracoes() : Promise.resolve(null),
        aba === "contato" ? destinatariosDaEquipe() : Promise.resolve([]),
        listarProfessoresAdmin(),
        listarGaleriaAdmin(),
      ])
    : [[], null, [], [], []];
  // Traduções (só a aba aberta carrega as suas).
  const traducoesProfessores: Record<string, DadosDeTraducao> = {};
  const traducoesFotos: Record<string, DadosDeTraducao> = {};
  let traducoesConfig: DadosDeTraducao | null = null;
  if (admin && aba === "professores") for (const p of profs) { const d = await dadosDeTraducao("professor", p.id); if (d) traducoesProfessores[p.id] = d; }
  if (admin && aba === "galeria") for (const f of galeria) { const d = await dadosDeTraducao("foto", f.id); if (d) traducoesFotos[f.id] = d; }
  let textosCurso: Awaited<ReturnType<typeof lerBlocosEmPortugues>> | null = null;
  const traducoesBlocos: Partial<Record<Bloco, DadosDeTraducao>> = {};
  const traducoesDepoimentos: Record<string, DadosDeTraducao> = {};
  let depoimentosLista: Awaited<ReturnType<typeof listarDepoimentosAdmin>> = [];
  if (admin && aba === "curso") {
    textosCurso = await lerBlocosEmPortugues();
    for (const b of BLOCOS) { const d = await dadosDeTraducao("textoCurso", b); if (d) traducoesBlocos[b] = d; }
    depoimentosLista = await listarDepoimentosAdmin();
    for (const d of depoimentosLista) { const t = await dadosDeTraducao("depoimento", d.id); if (t) traducoesDepoimentos[d.id] = t; }
  }
  if (admin && aba === "contato") traducoesConfig = await dadosDeTraducao("config", 1);
  const cfg = lerConfig();

  return (
    <PaginaAdmin usuario={usuario} ativo="config" titulo="Configurações">
      <div className={styles.pilha}>
        {!admin && <TrocarSenhaForm acao={trocarMinhaSenha} />}
        {admin && (
          <ConfiguracoesTabs
            valor={aba}
            items={[
              { value: "professores", label: "Professores", count: profs.length },
              { value: "galeria", label: "Galeria", count: galeria.length },
              { value: "curso", label: "Curso" },
              { value: "contato", label: "Contato do site" },
              { value: "usuarios", label: "Usuários" },
            ]}
          />
        )}
        {admin && aba === "professores" && <ProfessoresAdmin professores={profs} traducoes={traducoesProfessores} />}
        {admin && aba === "galeria" && <GaleriaAdmin fotos={galeria} traducoes={traducoesFotos} />}
        {admin && aba === "curso" && textosCurso && (
          <>
            <CursoAdmin textos={textosCurso} traducoes={traducoesBlocos} />
            <h2 className={styles.titulo}>Depoimentos</h2>
            <DepoimentosAdmin depoimentos={depoimentosLista} traducoes={traducoesDepoimentos} />
          </>
        )}
        {admin && aba === "contato" && pode(usuario.papel, "configuracao:editar") && (
          <>
            <DadosClinicaForm
              acao={salvarConfiguracoes}
              padroes={SITE_PADRAO}
              valores={{
                telefone: linha?.telefone ?? "",
                whatsapp: linha?.whatsapp ?? "",
                instagram: linha?.instagram ?? "",
                email: linha?.email ?? "",
                enderecoLinha1: linha?.enderecoLinha1 ?? "",
                enderecoLinha2: linha?.enderecoLinha2 ?? "",
                horario: linha?.horario ?? "",
              }}
            />
            {traducoesConfig && <TraducoesAdmin dados={traducoesConfig} />}
            <EmailDeTeste
              acao={enviarEmailDeTeste}
              info={{
                provedor: cfg.provedor,
                remetente: cfg.ok ? `${cfg.remetente.nome} <${cfg.remetente.email}>` : null,
                configurado: cfg.ok,
                erro: cfg.ok ? null : cfg.erro,
                destino: usuario.email,
                avisosPara,
              }}
            />
          </>
        )}
        {admin && aba === "usuarios" && (
          <>
            <TrocarSenhaForm acao={trocarMinhaSenha} />
            <UsuariosAdmin
              usuarios={lista.map((u) => ({ ...u, souEu: u.id === usuario.id }))}
              criar={criarUsuario}
              redefinirSenha={redefinirSenhaUsuario}
              alternarAtivo={alternarUsuarioAtivo}
              alterarPapel={alterarPapelUsuario}
            />
          </>
        )}
      </div>
    </PaginaAdmin>
  );
}
