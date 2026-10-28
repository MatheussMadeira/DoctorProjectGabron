import type { MetadataRoute } from "next";

/* Ícones de app (kit de logo do ReabToxin): ao "instalar" o site no celular, o ícone é o símbolo sobre o azul-escuro da marca. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ReabToxin",
    short_name: "ReabToxin",
    description: "Curso prático de toxina botulínica para profissionais da saúde.",
    start_url: "/",
    display: "browser",
    background_color: "#f5ebdf",
    theme_color: "#28334f",
    lang: "pt-BR",
    icons: [
      { src: "/icone-app-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-app-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-app.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
