import { Bus, Car, ChevronDown, Plane, Ticket } from "lucide-react";
import type { ComponentType } from "react";
import { ICON } from "@/lib/icon";
import type { ItemChegada } from "@/lib/viagem";
import styles from "./viagem.module.css";

const ICONES: Record<ItemChegada["icone"], ComponentType<Record<string, unknown>>> = { aviao: Plane, onibus: Bus, carro: Car, bilhete: Ticket };

/* "Como chegar": uma sanfona por item (aeroporto, ônibus e aplicativo, carro…). Usa <details>, que já funciona com teclado e leitor de tela. */
export function ChegadaViagem({ itens }: { itens: ItemChegada[] }) {
  return (
    <div className={styles.sanfonas}>
      {itens.map((c) => {
        const I = ICONES[c.icone];
        return (
          <details key={c.id} className={styles.sanfona}>
            <summary className={styles.sanfonaTitulo}>
              <I {...ICON} size={22} aria-hidden="true" />
              <span>{c.titulo}</span>
              <ChevronDown {...ICON} size={20} aria-hidden="true" className={styles.sanfonaSeta} />
            </summary>
            <div className={styles.sanfonaTexto}>
              {c.texto.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
