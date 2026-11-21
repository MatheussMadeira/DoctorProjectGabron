import type { Metadata } from "next";
import { ConfiguracoesTabsBase } from "@/components/molecules/ConfiguracoesTabs";
import { ChegadaAdminLista, LocaisAdmin } from "@/components/organisms/ViagemAdmin";
import { listarChegadaAdmin, listarLocaisAdmin } from "@/lib/admin-viagem";
import { dadosDeTraducao, type DadosDeTraducao } from "@/lib/i18n/admin";
import { pode } from "@/lib/permissoes";
import { exigirSessao } from "@/lib/sessao";
import { PaginaAdmin } from "../pagina";
import styles from "@/components/admin.module.css";

export const metadata: Metadata = { title: "Viagem" };

const ABAS = ["locais", "chegada"] as const;

export default async function ViagemAdminPage({ searchParams }: PageProps<"/admin/viagem">) {
  const [usuario, params] = await Promise.all([exigirSessao(), searchParams]);
  const pedida = String(params.aba ?? "");
  const aba = (ABAS as readonly string[]).includes(pedida) ? (pedida as (typeof ABAS)[number]) : "locais";
  const admin = pode(usuario.papel, "viagem:gerir");

  const [locais, chegada] = admin ? await Promise.all([listarLocaisAdmin(), listarChegadaAdmin()]) : [[], []];
  const traducoesLocais: Record<string, DadosDeTraducao> = {};
  const traducoesChegada: Record<string, DadosDeTraducao> = {};
  if (admin && aba === "locais") for (const l of locais) { const d = await dadosDeTraducao("localViagem", l.id); if (d) traducoesLocais[l.id] = d; }
  if (admin && aba === "chegada") for (const c of chegada) { const d = await dadosDeTraducao("chegadaViagem", c.id); if (d) traducoesChegada[c.id] = d; }

  return (
    <PaginaAdmin usuario={usuario} ativo="viagem" titulo="Viagem">
      <div className={styles.pilha}>
        {!admin && <p className={styles.muted}>Só administradores editam a Travel info.</p>}
        {admin && (
          <>
            <ConfiguracoesTabsBase
              base="/admin/viagem"
              valor={aba}
              rotulo="Seções da Travel info"
              items={[
                { value: "locais", label: "Locais", count: locais.length },
                { value: "chegada", label: "Como chegar", count: chegada.length },
              ]}
            />
            {aba === "locais" && <LocaisAdmin locais={locais} traducoes={traducoesLocais} />}
            {aba === "chegada" && <ChegadaAdminLista itens={chegada} traducoes={traducoesChegada} />}
          </>
        )}
      </div>
    </PaginaAdmin>
  );
}
