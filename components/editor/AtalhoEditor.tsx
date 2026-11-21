import Link from "next/link";
import { PAGINAS, PAGINAS_EDITAVEIS } from "@/lib/site-secoes/paginas";
import { Alert } from "../molecules/Alert";
import styles from "../admin.module.css";

/** Configurações › Curso: os textos do topo, da proposta, dos pilares, dos números e dos valores agora se editam no editor visual. */
export function AtalhoEditor() {
  return (
    <Alert tone="info" title="Os textos das páginas agora ficam no editor visual">
      <p>O topo da home, a proposta, os pilares, os números e os valores são editados vendo a página: clique no texto ou na foto e escreva. As traduções saem ao publicar.</p>
      <div className={styles.acoesLinha}>
        {PAGINAS_EDITAVEIS.map((p) => (
          <Link key={p} className="ap-btn ap-btn-secondary ap-btn-sm" href={`/admin/editor?pagina=${p}`} prefetch={false}>
            Editar: {PAGINAS[p].rotulo}
          </Link>
        ))}
      </div>
    </Alert>
  );
}
