import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Material de referência (specs, telas e design system em JSX), não faz parte do app.
    "site-dra-ana-paula/**",
  ]),
  // Nenhum texto fixo no JSX do site público: tudo vem de messages/<idioma>.json (next-intl). Só pontuação, espaço e símbolos passam.
  // O painel (/admin), a página /dev, o design system sem texto próprio e os formulários (que usam useTranslations) ficam de fora.
  {
    files: [
      "app/(site)/**/*.tsx",
      "components/templates/PublicTemplate.tsx",
      "components/templates/SiteHeader.tsx",
      "components/organisms/{Footer,Header,SeletorDeIdioma,SugestaoDeIdioma,AvisoDeTraducao}.tsx",
    ],
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: false, allowedStrings: ["·", "—", "–", "|", "/", "•", "×", "(", ")", ",", ".", ":"], ignoreProps: true }],
    },
  },
]);

export default eslintConfig;
