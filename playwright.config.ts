import { defineConfig } from "@playwright/test";

// Os testes que falam com o banco (rascunho) precisam do DATABASE_URL do .env.local.
process.loadEnvFile(".env.local");

// Os testes e2e rodam contra o build de produção (yarn build antes). Porta própria, para não colidir com o yarn dev.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  globalTeardown: "./e2e/limpar-traducoes.ts",
  use: { baseURL: "http://localhost:3107" },
  webServer: {
    command: "node --env-file=.env.local node_modules/next/dist/bin/next start -p 3107",
    url: "http://localhost:3107",
    reuseExistingServer: false,
    // Os e-mails dos testes não saem de verdade: o provedor "console" só registra e imprime.
    env: { EMAIL_PROVIDER: "console", I18N_PROVEDOR: "falso", TESTE_E2E: "1" },
    timeout: 60_000,
  },
});
