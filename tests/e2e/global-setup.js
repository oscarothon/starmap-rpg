/** Recria o banco de teste com o cenário de exemplo antes da suíte E2E. */

import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";

export const CAMINHO_BANCO = ".tmp-e2e.db";

export function pythonDoProjeto() {
  return process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python";
}

export default function globalSetup() {
  if (existsSync(CAMINHO_BANCO)) unlinkSync(CAMINHO_BANCO);
  execFileSync(pythonDoProjeto(), ["-m", "backend.seed", CAMINHO_BANCO], {
    stdio: "inherit",
  });
}
