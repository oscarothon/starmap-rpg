import { defineConfig, devices } from "@playwright/test";

import { CAMINHO_BANCO, pythonDoProjeto } from "./tests/e2e/global-setup.js";

const PORTA = 5174;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.js",
  timeout: 30_000,
  // Um worker só: todos os testes compartilham o mesmo banco, e os do editor
  // criam/excluem sistemas que os do índice contam. Em paralelo, dá corrida.
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: `http://127.0.0.1:${PORTA}`,
    viewport: { width: 1440, height: 900 },
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `"${pythonDoProjeto()}" wsgi.py`,
    url: `http://127.0.0.1:${PORTA}`,
    reuseExistingServer: false,
    env: {
      DATABASE_PATH: CAMINHO_BANCO,
      PORT: String(PORTA),
    },
  },
});
