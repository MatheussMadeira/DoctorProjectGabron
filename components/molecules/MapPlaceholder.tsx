import { Map as MapIcon } from "lucide-react";
import { ICON } from "@/lib/icon";
import styles from "./lists.module.css";

/** Espaço reservado para o mapa da clínica, até a Dra. confirmar o endereço. */
export function MapPlaceholder({ label = "Mapa da clínica" }: { label?: string }) {
  return (
    <div role="img" aria-label={`Espaço reservado para o ${label.toLowerCase()}`} className={styles.map}>
      <MapIcon {...ICON} size={28} />
      <span>{label}</span>
    </div>
  );
}
