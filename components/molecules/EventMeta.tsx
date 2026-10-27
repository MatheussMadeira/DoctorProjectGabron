import { Clock, MapPin, Monitor, Users } from "lucide-react";
import { ICON } from "@/lib/icon";

export interface EventMetaProps {
  time?: string;
  city?: string;
  venue?: string;
  modality?: string;
  seats?: string;
}

/** Horário, local e vagas de uma data, em lista com ícones. */
export function EventMeta({ time, city, venue, modality, seats }: EventMetaProps) {
  return (
    <ul className="ap-meta">
      {time && (
        <li>
          <Clock {...ICON} size={18} />
          {time}
        </li>
      )}
      {(city || venue) && (
        <li>
          {modality === "Online" ? <Monitor {...ICON} size={18} /> : <MapPin {...ICON} size={18} />}
          {[venue, city].filter(Boolean).join(" · ")}
        </li>
      )}
      {seats && (
        <li>
          <Users {...ICON} size={18} />
          {seats}
        </li>
      )}
    </ul>
  );
}
