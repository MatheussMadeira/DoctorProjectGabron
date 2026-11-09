"use client";

/**
 * CreatorCredit — assinatura de quem desenvolveu o site, logo abaixo do rodapé.
 * Gatilho "Site desenvolvido por …" (três marcas acendem em sequência no hover/foco) → "Ficha técnica"
 * (<dialog> nativo: Esc e clique fora fecham, o foco volta ao gatilho). Textos em messages ("Credito.*").
 */
import { useId, useRef, useState } from "react";
import { Code2, Globe, PencilRuler, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { siGithub, siWhatsapp } from "simple-icons";
import { ICON } from "@/lib/icon";
import { BrandIcon } from "../atoms/BrandIcon";
import { Button } from "../atoms/Button";
import { Logo } from "../atoms/Logo";
import styles from "./CreatorCredit.module.css";

const NOME = "Matheus Madeira";
const INICIAIS = "MM";
const LINKEDIN_URL = "https://www.linkedin.com/in/matheus-madeira22/";
const GITHUB_URL = "https://github.com/MatheussMadeira";
const WHATSAPP = "5531996193940";
const ANO = 2026;

/* O lucide-react 1.x não tem ícones de marca e o Simple Icons removeu o LinkedIn: glifo em traço, no mesmo padrão. */
function LinkedinIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function CreatorCredit() {
  const t = useTranslations("Credito");
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false);
  const tituloId = useId();

  const abrir = () => {
    const d = dialogoRef.current;
    if (!d || d.open) return;
    d.showModal();
    setAberto(true);
  };
  const fechar = () => dialogoRef.current?.close();
  const whatsappHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t("whatsappMensagem"))}`;

  return (
    <>
      <div className={styles.faixa} data-theme="escuro">
        <div className={`ap-container ${styles.faixaInterna}`}>
          <button ref={gatilhoRef} type="button" className={styles.gatilho} aria-haspopup="dialog" aria-expanded={aberto} onClick={abrir}>
            <span className={styles.marcas} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              {t("gatilho")} <strong>{NOME}</strong>
            </span>
          </button>
        </div>
      </div>

      {/* Fora da faixa escura: a ficha usa o tema claro. */}
      <dialog
        ref={dialogoRef}
        className={styles.dialogo}
        aria-labelledby={tituloId}
        onClose={() => {
          setAberto(false);
          gatilhoRef.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) fechar();
        }}
      >
        <div className={styles.cartao}>
          <div className={styles.topo} data-theme="escuro">
            <p className="ap-eyebrow">{t("eyebrow")}</p>
            <Logo variant="simbolo" width={44} title="" />
            <button type="button" className={styles.fechar} aria-label={t("fechar")} onClick={fechar}>
              <X {...ICON} size={22} />
            </button>
          </div>

          <div className={styles.corpo}>
            <div className={styles.cabeca}>
              <span className={styles.monograma} aria-hidden="true">
                {INICIAIS}
              </span>
              <div>
                <h2 id={tituloId} className={styles.nome}>
                  {NOME}
                </h2>
                <p className={styles.cargo}>{t("cargo")}</p>
              </div>
            </div>

            <p className={styles.texto}>{t("texto")}</p>

            <ol className={styles.etapas} aria-label={t("etapas")}>
              <li>
                <span className={styles.ponto}>
                  <PencilRuler {...ICON} size={16} />
                </span>
                <span>
                  {t("etapaDesign")}
                  <small>{t("etapaDesignInfo")}</small>
                </span>
              </li>
              <li>
                <span className={styles.ponto}>
                  <Code2 {...ICON} size={16} />
                </span>
                <span>
                  {t("etapaCodigo")}
                  <small>{t("etapaCodigoInfo")}</small>
                </span>
              </li>
              <li>
                <span className={styles.ponto}>
                  <Globe {...ICON} size={16} />
                </span>
                <span>
                  {t("etapaPublicacao")}
                  <small>{t("etapaPublicacaoInfo")}</small>
                </span>
              </li>
            </ol>

            <div className={styles.links}>
              <Button href={whatsappHref} target="_blank" rel="noopener noreferrer" icon={<BrandIcon icon={siWhatsapp} />} full>
                {t("whatsapp")}
              </Button>
              <Button variant="secondary" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" icon={<LinkedinIcon />} full>
                {t("linkedin")}
              </Button>
              <Button variant="secondary" href={GITHUB_URL} target="_blank" rel="noopener noreferrer" icon={<BrandIcon icon={siGithub} />} full>
                {t("github")}
              </Button>
            </div>

            <p className={styles.rodape}>
              <span>{t("concluido", { ano: ANO })}</span>
              <span>{t("novaAba")}</span>
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
