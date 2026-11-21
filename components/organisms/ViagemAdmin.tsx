"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Search, Trash2 } from "lucide-react";
import { enviarSemLimpar } from "@/lib/enviar-sem-limpar";
import { ICON } from "@/lib/icon";
import { buscarEndereco, excluirChegada, excluirLocal, moverChegada, moverLocal, salvarChegada, salvarLocal, type ResultadoBusca } from "@/app/(painel)/admin/acoes-viagem";
import type { ChegadaAdmin, LocalViagemAdmin } from "@/lib/admin-viagem";
import type { DadosDeTraducao } from "@/lib/i18n/admin";
import type { EstadoViagem } from "@/lib/viagem-form";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Checkbox";
import { Alert } from "../molecules/Alert";
import { Select } from "../molecules/Select";
import { TextField } from "../molecules/TextField";
import { AdminTable } from "./AdminTable";
import { FotoDialog } from "./FotoDialog";
import { TraducoesAdmin } from "./TraducoesAdmin";
import styles from "../admin.module.css";

/* Travel info no painel: "Locais" (local do curso, hotéis, restaurantes e turismo) e "Como chegar". O português é editado aqui;
   as outras línguas saem da DeepL ao salvar e são revisadas na seção "Traduções" de cada item. */

const CATEGORIAS = [
  { value: "LOCAL", label: "Local do curso" },
  { value: "HOTEL", label: "Hotel" },
  { value: "RESTAURANTE", label: "Restaurante" },
  { value: "TURISMO", label: "Turismo" },
];
const ROTULO_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.value, c.label]));
const ICONES = [
  { value: "aviao", label: "Avião (aeroporto)" },
  { value: "onibus", label: "Ônibus e aplicativo" },
  { value: "carro", label: "Carro" },
  { value: "bilhete", label: "Bilhete e passagens" },
];
const PRECOS = [
  { value: "", label: "Não informar" },
  { value: "1", label: "$ (econômico)" },
  { value: "2", label: "$$ (moderado)" },
  { value: "3", label: "$$$ (alto)" },
  { value: "4", label: "$$$$ (sofisticado)" },
];

/* ------------------------------ Locais ------------------------------ */

function FormularioLocal({ local, aoCancelar }: { local: LocalViagemAdmin | null; aoCancelar: () => void }) {
  const idSalvo = useRef<string | null>(local?.id ?? null);
  const [estado, enviar, pendente] = useActionState(async (anterior: EstadoViagem, formData: FormData) => {
    const r = await salvarLocal(idSalvo.current, anterior, formData);
    if (r.id) idSalvo.current = r.id;
    return r;
  }, {} as EstadoViagem);
  const erros = estado.erros ?? {};
  // Controlados: o React 19 limpa os campos não controlados depois de uma ação, e um erro apagaria o que foi digitado.
  const [v, setV] = useState({
    categoria: local?.categoria ?? "HOTEL",
    nome: local?.nome ?? "",
    descricao: local?.descricao ?? "",
    endereco: local?.endereco ?? "",
    latitude: local?.latitude != null ? String(local.latitude) : "",
    longitude: local?.longitude != null ? String(local.longitude) : "",
    site: local?.site ?? "",
    telefone: local?.telefone ?? "",
    faixaPreco: local?.faixaPreco != null ? String(local.faixaPreco) : "",
    visivel: local?.visivel ?? true,
  });
  const campo = (k: "nome" | "descricao" | "endereco" | "latitude" | "longitude" | "site" | "telefone") => ({ value: v[k], onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value })) });
  const [foto, setFoto] = useState({ url: local?.fotoUrl ?? "", alt: local?.fotoAlt ?? "" });
  const [fotoAberta, setFotoAberta] = useState(false);
  const [buscando, iniciarBusca] = useTransition();
  const [busca, setBusca] = useState<{ resultados?: ResultadoBusca[]; erro?: string } | null>(null);

  const procurar = () =>
    iniciarBusca(async () => {
      setBusca(await buscarEndereco([v.nome, v.endereco].filter(Boolean).join(", ")));
    });

  return (
    <form onSubmit={(e) => enviarSemLimpar(e, enviar)} className={styles.cartaoForm} noValidate aria-label={local ? `Editar ${local.nome}` : "Novo local"}>
      <h2 className={styles.titulo}>{local ? "Editar local" : "Novo local"}</h2>
      {estado.erroGeral && (
        <Alert tone="danger" title="Não foi possível salvar">
          {estado.erroGeral}
        </Alert>
      )}
      {estado.ok && (
        <Alert tone="success" title="Local salvo">
          O site já mostra as mudanças. A DeepL preparou os rascunhos de tradução.
        </Alert>
      )}
      <input type="hidden" name="fotoUrl" value={foto.url} />
      <input type="hidden" name="fotoAlt" value={foto.alt} />
      <Select label="Categoria" name="categoria" required value={v.categoria} onChange={(e) => setV((x) => ({ ...x, categoria: e.target.value as typeof x.categoria }))} options={CATEGORIAS} error={erros.categoria} />
      <TextField label="Nome" name="nome" required {...campo("nome")} error={erros.nome} />
      <TextField label="Descrição" name="descricao" multiline rows={4} {...campo("descricao")} error={erros.descricao} hint="Duas ou três frases: por que vale a pena, como chegar ao curso a pé ou de carro." />
      <TextField label="Endereço" name="endereco" {...campo("endereco")} error={erros.endereco} />
      <div className={styles.pilhaCurta}>
        <Button type="button" variant="secondary" size="sm" onClick={procurar} disabled={buscando || !(v.nome || v.endereco)}>
          <Search {...ICON} size={16} aria-hidden="true" /> {buscando ? "Buscando…" : "Buscar no mapa"}
        </Button>
        <span className={styles.nota}>Preenche latitude e longitude pelo OpenStreetMap (gratuito). Confira o resultado antes de usar.</span>
        {busca?.erro && <p className="ap-hint ap-hint-error">{busca.erro}</p>}
        {busca?.resultados && (
          <ul className={styles.pilhaCurta}>
            {busca.resultados.map((r) => (
              <li key={`${r.latitude},${r.longitude}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setV((x) => ({ ...x, latitude: r.latitude.toFixed(6), longitude: r.longitude.toFixed(6), endereco: x.endereco || r.rotulo }));
                    setBusca(null);
                  }}
                >
                  {r.rotulo}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.linha}>
        <TextField label="Latitude" name="latitude" inputMode="decimal" {...campo("latitude")} error={erros.latitude} />
        <TextField label="Longitude" name="longitude" inputMode="decimal" {...campo("longitude")} error={erros.longitude} />
      </div>
      <div className={styles.fotoRetrato}>
        {foto.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia direta da foto no painel
          <img src={foto.url} alt={foto.alt || "Foto atual"} className={styles.fotoRetratoImg} />
        ) : (
          <div className={`${styles.fotoRetratoImg} ${styles.fotoRetratoVazia}`} aria-hidden="true">
            ?
          </div>
        )}
        <div className={styles.pilhaCurta}>
          <Button type="button" variant="secondary" size="sm" onClick={() => setFotoAberta(true)}>
            {foto.url ? "Trocar foto" : "Enviar foto"}
          </Button>
          {foto.url && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setFoto({ url: "", alt: "" })}>
              Remover foto
            </Button>
          )}
          <span className={styles.nota}>Foto horizontal. Você ajusta o enquadramento.</span>
          {erros.fotoUrl && <p className="ap-hint ap-hint-error">{erros.fotoUrl}</p>}
        </div>
      </div>
      <TextField label="Site" name="site" type="url" {...campo("site")} error={erros.site} hint="Endereço completo, com https://." />
      <TextField label="Telefone" name="telefone" type="tel" {...campo("telefone")} error={erros.telefone} />
      <Select label="Faixa de preço" name="faixaPreco" value={v.faixaPreco} onChange={(e) => setV((x) => ({ ...x, faixaPreco: e.target.value }))} options={PRECOS} error={erros.faixaPreco} />
      <Checkbox name="visivel" label="Mostrar no site" checked={v.visivel} onChange={(e) => setV((x) => ({ ...x, visivel: e.target.checked }))} />
      <div className={styles.rodape}>
        <Button type="button" variant="ghost" onClick={aoCancelar}>
          {local ? "Cancelar" : "Limpar"}
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando e traduzindo…" : "Salvar local"}
        </Button>
      </div>
      <FotoDialog
        aberto={fotoAberta}
        atual={{ url: foto.url, alt: "" }}
        formato="paisagem"
        biblioteca={false}
        pedirDescricao={false}
        titulo="Foto do local"
        onFechar={() => setFotoAberta(false)}
        onUsar={(f) => {
          setFoto({ url: f.url, alt: v.nome.trim() ? `Foto de ${v.nome.trim()}` : "Foto do local" });
          setFotoAberta(false);
        }}
      />
    </form>
  );
}

export function LocaisAdmin({ locais, traducoes = {} }: { locais: LocalViagemAdmin[]; traducoes?: Record<string, DadosDeTraducao> }) {
  const [editando, setEditando] = useState<LocalViagemAdmin | null>(null);
  const [versao, setVersao] = useState(0);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const executar = (fn: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      setErro((await fn()).erro ?? null);
      setConfirmando(null);
    });
  const novo = () => {
    setEditando(null);
    setVersao((x) => x + 1);
  };

  return (
    <div className={styles.professores}>
      <div className={styles.professoresLista}>
        <p className={styles.muted}>A ordem da lista, dentro de cada categoria, é a ordem em que os locais aparecem no site. A distância até o local do curso é calculada pelas coordenadas.</p>
        {erro && (
          <Alert tone="danger" title="Não foi possível concluir">
            {erro}
          </Alert>
        )}
        <AdminTable
          vazio="Nenhum local cadastrado ainda."
          linhas={locais}
          colunas={[
            { key: "nome", label: "Local", render: (l) => (<div className={styles.nomeCelula}><strong>{l.nome}</strong><span>{ROTULO_CATEGORIA[l.categoria]}</span></div>) },
            { key: "mapa", label: "Mapa", render: (l) => (l.latitude != null ? <Badge tone="success">Com coordenadas</Badge> : <Badge tone="warning">Sem coordenadas</Badge>) },
            { key: "visivel", label: "No site", render: (l) => <Badge tone={l.visivel ? "success" : "neutral"}>{l.visivel ? "Visível" : "Oculto"}</Badge> },
          ]}
          acoes={(l) => {
            const daCategoria = locais.filter((x) => x.categoria === l.categoria);
            const i = daCategoria.findIndex((x) => x.id === l.id);
            return (
              <div className={styles.acoesLinha}>
                <button type="button" className={styles.iconeBotao} aria-label={`Subir ${l.nome}`} disabled={i === 0} onClick={() => executar(() => moverLocal(l.id, "sobe"))}>
                  <ArrowUp {...ICON} size={18} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Descer ${l.nome}`} disabled={i === daCategoria.length - 1} onClick={() => executar(() => moverLocal(l.id, "desce"))}>
                  <ArrowDown {...ICON} size={18} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Editar ${l.nome}`} onClick={() => { setEditando(l); setVersao((x) => x + 1); }}>
                  <Pencil {...ICON} size={18} />
                </button>
                {confirmando === l.id ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => executar(() => excluirLocal(l.id))}>
                    Confirmar exclusão
                  </Button>
                ) : (
                  <button type="button" className={styles.iconeBotao} aria-label={`Excluir ${l.nome}`} onClick={() => setConfirmando(l.id)}>
                    <Trash2 {...ICON} size={18} />
                  </button>
                )}
              </div>
            );
          }}
        />
      </div>
      <div className={styles.professoresForm}>
        <Button type="button" size="sm" variant="secondary" onClick={novo}>
          Novo local
        </Button>
        {editando && traducoes[editando.id] && <TraducoesAdmin key={`${editando.id}-${versao}`} dados={traducoes[editando.id]} />}
        <FormularioLocal key={`${editando?.id ?? "novo"}-${versao}`} local={editando} aoCancelar={novo} />
      </div>
    </div>
  );
}

/* ---------------------------- Como chegar ---------------------------- */

function FormularioChegada({ item, aoCancelar }: { item: ChegadaAdmin | null; aoCancelar: () => void }) {
  const idSalvo = useRef<string | null>(item?.id ?? null);
  const [estado, enviar, pendente] = useActionState(async (anterior: EstadoViagem, formData: FormData) => {
    const r = await salvarChegada(idSalvo.current, anterior, formData);
    if (r.id) idSalvo.current = r.id;
    return r;
  }, {} as EstadoViagem);
  const erros = estado.erros ?? {};
  const [v, setV] = useState({ icone: item?.icone ?? "aviao", titulo: item?.titulo ?? "", texto: item?.texto ?? "", visivel: item?.visivel ?? true });

  return (
    <form onSubmit={(e) => enviarSemLimpar(e, enviar)} className={styles.cartaoForm} noValidate aria-label={item ? `Editar ${item.titulo}` : "Novo item"}>
      <h2 className={styles.titulo}>{item ? "Editar item" : "Novo item"}</h2>
      {estado.erroGeral && (
        <Alert tone="danger" title="Não foi possível salvar">
          {estado.erroGeral}
        </Alert>
      )}
      {estado.ok && (
        <Alert tone="success" title="Item salvo">
          O site já mostra as mudanças. A DeepL preparou os rascunhos de tradução.
        </Alert>
      )}
      <Select label="Ícone" name="icone" required value={v.icone} onChange={(e) => setV((x) => ({ ...x, icone: e.target.value as typeof x.icone }))} options={ICONES} error={erros.icone} />
      <TextField label="Título" name="titulo" required value={v.titulo} onChange={(e) => setV((x) => ({ ...x, titulo: e.target.value }))} error={erros.titulo} hint="Ex.: Do aeroporto de Confins até o local do curso." />
      <TextField label="Texto" name="texto" multiline rows={7} required value={v.texto} onChange={(e) => setV((x) => ({ ...x, texto: e.target.value }))} error={erros.texto} hint="Uma linha em branco separa os parágrafos." />
      <Checkbox name="visivel" label="Mostrar no site" checked={v.visivel} onChange={(e) => setV((x) => ({ ...x, visivel: e.target.checked }))} />
      <div className={styles.rodape}>
        <Button type="button" variant="ghost" onClick={aoCancelar}>
          {item ? "Cancelar" : "Limpar"}
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando e traduzindo…" : "Salvar item"}
        </Button>
      </div>
    </form>
  );
}

export function ChegadaAdminLista({ itens, traducoes = {} }: { itens: ChegadaAdmin[]; traducoes?: Record<string, DadosDeTraducao> }) {
  const [editando, setEditando] = useState<ChegadaAdmin | null>(null);
  const [versao, setVersao] = useState(0);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const executar = (fn: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      setErro((await fn()).erro ?? null);
      setConfirmando(null);
    });
  const novo = () => {
    setEditando(null);
    setVersao((x) => x + 1);
  };

  return (
    <div className={styles.professores}>
      <div className={styles.professoresLista}>
        <p className={styles.muted}>Cada item vira uma sanfona na aba &quot;Como chegar&quot; do site, na ordem desta lista.</p>
        {erro && (
          <Alert tone="danger" title="Não foi possível concluir">
            {erro}
          </Alert>
        )}
        <AdminTable
          vazio="Nenhum item cadastrado ainda."
          linhas={itens}
          colunas={[
            { key: "titulo", label: "Item", render: (c) => (<div className={styles.nomeCelula}><strong>{c.titulo}</strong><span>{ICONES.find((i) => i.value === c.icone)?.label}</span></div>) },
            { key: "visivel", label: "No site", render: (c) => <Badge tone={c.visivel ? "success" : "neutral"}>{c.visivel ? "Visível" : "Oculto"}</Badge> },
          ]}
          acoes={(c) => {
            const i = itens.findIndex((x) => x.id === c.id);
            return (
              <div className={styles.acoesLinha}>
                <button type="button" className={styles.iconeBotao} aria-label={`Subir ${c.titulo}`} disabled={i === 0} onClick={() => executar(() => moverChegada(c.id, "sobe"))}>
                  <ArrowUp {...ICON} size={18} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Descer ${c.titulo}`} disabled={i === itens.length - 1} onClick={() => executar(() => moverChegada(c.id, "desce"))}>
                  <ArrowDown {...ICON} size={18} />
                </button>
                <button type="button" className={styles.iconeBotao} aria-label={`Editar ${c.titulo}`} onClick={() => { setEditando(c); setVersao((x) => x + 1); }}>
                  <Pencil {...ICON} size={18} />
                </button>
                {confirmando === c.id ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => executar(() => excluirChegada(c.id))}>
                    Confirmar exclusão
                  </Button>
                ) : (
                  <button type="button" className={styles.iconeBotao} aria-label={`Excluir ${c.titulo}`} onClick={() => setConfirmando(c.id)}>
                    <Trash2 {...ICON} size={18} />
                  </button>
                )}
              </div>
            );
          }}
        />
      </div>
      <div className={styles.professoresForm}>
        <Button type="button" size="sm" variant="secondary" onClick={novo}>
          Novo item
        </Button>
        {editando && traducoes[editando.id] && <TraducoesAdmin key={`${editando.id}-${versao}`} dados={traducoes[editando.id]} />}
        <FormularioChegada key={`${editando?.id ?? "novo"}-${versao}`} item={editando} aoCancelar={novo} />
      </div>
    </div>
  );
}
