/** Recria o banco de teste com o cenário de exemplo antes da suíte E2E. */

import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

export const CAMINHO_BANCO = ".tmp-e2e.db";

/** Caminho absoluto do Python do venv (o cmd.exe não aceita "./" com barra normal). */
export function pythonDoProjeto() {
  const relativo =
    process.platform === "win32" ? ".venv\\Scripts\\python.exe" : ".venv/bin/python";
  return resolve(process.cwd(), relativo);
}

export default function globalSetup() {
  if (existsSync(CAMINHO_BANCO)) unlinkSync(CAMINHO_BANCO);
  execFileSync(pythonDoProjeto(), ["-m", "backend.seed", CAMINHO_BANCO], {
    stdio: "inherit",
  });
}
