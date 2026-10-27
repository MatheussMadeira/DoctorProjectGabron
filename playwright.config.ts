import { defineConfig } from "@playwright/test";

// Os testes que falam com o banco (rascunho) precisam do DATABASE_URL do .env.local.
process.loadEnvFile(".env.local");

// Os testes e2e rodam contra o build de produção (yarn build antes). Porta própria, para não colidir com o yarn dev.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3107" },
  webServer: {
    command: "node --env-file=.env.local node_modules/next/dist/bin/next start -p 3107",
    url: "http://localhost:3107",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
