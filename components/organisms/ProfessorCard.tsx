import Image from "next/image";
import { cx } from "@/lib/cx";

export interface ProfessorCardProps {
  nome: string;
  /** Função ou especialidade, acima do nome. */
  titulo: string;
  /** Professor médico: sempre CRM e RQE ("CRM-MG 00000 · RQE 00000"). */
  registro: string;
  bio?: string;
  foto?: string | null;
  fotoAlt?: string | null;
  /** "vertical": foto em cima (grade de professores). "horizontal": foto à esquerda (lista da turma). */
  layout?: "vertical" | "horizontal";
}

const semPrefixo = (nome: string) => nome.replace(/^(Dra?\.|Prof\.?|Profa\.?)\s+/i, "");

/* Cartão de professor (design ProfessorCard.dc.html): foto em retrato 4:5, ou a inicial do nome quando ainda não há foto. */
export function ProfessorCard({ nome, titulo, registro, bio, foto, fotoAlt, layout = "vertical" }: ProfessorCardProps) {
  return (
    <article className={cx("ap-prof", layout === "horizontal" && "ap-prof-h")}>
      {foto ? (
        <Image className="ap-prof-foto" src={foto} alt={fotoAlt || `Foto de ${nome}`} width={600} height={750} sizes={layout === "horizontal" ? "128px" : "(max-width: 600px) 100vw, 300px"} />
      ) : (
        <div className="ap-prof-foto ap-prof-vazia" aria-hidden="true">
          {(semPrefixo(nome).trim()[0] || "?").toUpperCase()}
        </div>
      )}
      <div className="ap-prof-corpo">
        <p className="ap-prof-titulo">{titulo}</p>
        <h3 className="ap-prof-nome">{nome}</h3>
        <p className="ap-prof-registro">{registro}</p>
        {bio && <p className="ap-prof-bio">{bio}</p>}
      </div>
    </article>
  );
}
