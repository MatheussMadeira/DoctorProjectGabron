"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { buscarCoordenadas } from "@/app/(painel)/admin/acoes-alumni";
import { ESTADOS } from "@/lib/brasil";
import { ICON } from "@/lib/icon";
import type { Local } from "@/lib/geocodificar";
import { Button } from "../atoms/Button";
import { Select } from "../molecules/Select";
import { TextField } from "../molecules/TextField";
import styles from "../admin.module.css";

export interface ValorLocalizacao {
  cidade: string;
  uf: string;
  pais: string;
  latitude: string;
  longitude: string;
}

/** Cidade, estado, país e coordenadas, com o botão "Buscar no mapa" (OpenStreetMap, gratuito). Os campos são controlados pelo formulário que o usa. */
export function CampoLocalizacao({ valor, aoMudar, erros = {} }: { valor: ValorLocalizacao; aoMudar: (parcial: Partial<ValorLocalizacao>) => void; erros?: Record<string, string> }) {
  const [buscando, iniciar] = useTransition();
  const [busca, setBusca] = useState<{ locais?: Local[]; erro?: string } | null>(null);
  const procurar = () =>
    iniciar(async () => {
      setBusca(await buscarCoordenadas(valor.cidade, valor.uf, valor.pais));
    });

  return (
    <div className={styles.pilhaCurta}>
      <div className={styles.linha}>
        <TextField label="Cidade" name="cidade" value={valor.cidade} onChange={(e) => aoMudar({ cidade: e.target.value })} error={erros.cidade} />
        <Select
          label="Estado"
          name="uf"
          value={valor.uf}
          onChange={(e) => aoMudar({ uf: e.target.value })}
          options={[{ value: "", label: "Fora do Brasil / sem estado" }, ...ESTADOS.map((e) => ({ value: e.sigla, label: `${e.sigla} · ${e.nome}` }))]}
          error={erros.uf}
        />
        <TextField label="País (2 letras)" name="pais" value={valor.pais} onChange={(e) => aoMudar({ pais: e.target.value.toUpperCase() })} error={erros.pais} hint="BR, PT, US…" maxLength={2} />
      </div>
      <div className={styles.pilhaCurta}>
        <Button type="button" variant="secondary" size="sm" onClick={procurar} disabled={buscando || valor.cidade.trim().length < 3}>
          <Search {...ICON} size={16} aria-hidden="true" /> {buscando ? "Buscando…" : "Buscar no mapa"}
        </Button>
        <span className={styles.nota}>Preenche latitude e longitude pela cidade (OpenStreetMap, gratuito). Confira o resultado antes de usar.</span>
        {busca?.erro && <p className="ap-hint ap-hint-error">{busca.erro}</p>}
        {busca?.locais && (
          <ul className={styles.pilhaCurta}>
            {busca.locais.map((l) => (
              <li key={`${l.latitude},${l.longitude}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    aoMudar({ latitude: l.latitude.toFixed(5), longitude: l.longitude.toFixed(5) });
                    setBusca(null);
                  }}
                >
                  {l.rotulo}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.linha}>
        <TextField label="Latitude" name="latitude" inputMode="decimal" value={valor.latitude} onChange={(e) => aoMudar({ latitude: e.target.value })} error={erros.latitude} />
        <TextField label="Longitude" name="longitude" inputMode="decimal" value={valor.longitude} onChange={(e) => aoMudar({ longitude: e.target.value })} error={erros.longitude} />
      </div>
    </div>
  );
}
