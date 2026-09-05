import { expect, test } from "@playwright/test";

/** Cada teste limpa pela API o que criou, para não afetar as contagens dos outros. */
async function excluirPelaApi(page, recurso, nome) {
  await page.evaluate(
    async ([caminho, alvo]) => {
      const itens = await fetch(`/api/${caminho}`).then((r) => r.json());
      for (const item of itens.filter((i) => i.name === alvo)) {
        await fetch(`/api/${caminho}/${item.id}`, { method: "DELETE" });
      }
    },
    [recurso, nome]
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/administracao");
  await expect(page.locator("#lista-regioes .registro").first()).toBeVisible();
});

test("lista as regiões e facções do cenário", async ({ page }) => {
  await expect(page.locator("#lista-regioes .registro")).toHaveCount(6);
  await expect(page.locator("#lista-faccoes .registro")).toHaveCount(5);
  await expect(page.locator("#admin-resumo")).toHaveText("6 regiões · 5 facções");
});

test("cria e exclui uma região", async ({ page }) => {
  await page.getByRole("button", { name: "+ Nova região" }).click();

  const dialogo = page.locator("#dialogo-fundo");
  await dialogo.locator('[name="name"]').fill("Braço de Teste");
  await dialogo.locator('[name="level"]').selectOption("cluster");
  await dialogo.locator('[data-acao="salvar"]').click();

  const registro = page.locator("#lista-regioes .registro", { hasText: "BRAÇO DE TESTE" });
  await expect(registro).toBeVisible();

  await registro.getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator(".dialogo__impacto")).toContainText("Nenhum sistema é apagado");
  await page.locator('[data-acao="confirmar"]').click();

  await expect(page.locator("#lista-regioes .registro")).toHaveCount(6);
});

test("recusa região sem nome", async ({ page }) => {
  await page.getByRole("button", { name: "+ Nova região" }).click();
  await page.locator('#dialogo-fundo [data-acao="salvar"]').click();

  await expect(page.locator(".aviso-flutuante--erro")).toContainText("Nome");
  await expect(page.locator("#dialogo-fundo")).toBeVisible();
});

test("cria e exclui uma facção", async ({ page }) => {
  await page.getByRole("button", { name: "+ Nova facção" }).click();

  const dialogo = page.locator("#dialogo-fundo");
  await dialogo.locator('[name="name"]').fill("Liga de Teste");
  await dialogo.locator('[name="short_name"]').fill("LT");
  await dialogo.locator('[data-acao="salvar"]').click();

  const registro = page.locator("#lista-faccoes .registro", { hasText: "LIGA DE TESTE" });
  await expect(registro).toBeVisible();

  await registro.getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator(".dialogo__impacto")).toContainText("independentes");
  await page.locator('[data-acao="confirmar"]').click();

  await expect(page.locator("#lista-faccoes .registro")).toHaveCount(5);
  await excluirPelaApi(page, "factions", "Liga de Teste");
});

test("avisa o impacto ao excluir uma facção que governa sistemas", async ({ page }) => {
  const registro = page.locator("#lista-faccoes .registro", { hasText: "CONSÓRCIO DE DRACÃO" });
  await registro.getByRole("button", { name: "Excluir" }).click();

  await expect(page.locator(".dialogo__impacto")).toContainText("3 sistema(s)");
  await page.locator('[data-acao="cancelar"]').click();

  await expect(page.locator("#lista-faccoes .registro")).toHaveCount(5);
});
