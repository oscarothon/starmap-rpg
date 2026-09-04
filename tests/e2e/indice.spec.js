import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/indice");
  await expect(page.locator(".linha-sistema").first()).toBeVisible();
});

test("lista todos os sistemas agrupados por região", async ({ page }) => {
  await expect(page.locator(".linha-sistema")).toHaveCount(16);
  await expect(page.locator("#indice-resumo")).toHaveText("16 de 16 sistemas");
  await expect(page.locator(".linha-grupo")).toHaveCount(3);
});

test("filtra pelo campo de busca", async ({ page }) => {
  await page.getByPlaceholder("Filtrar por sistema, região ou soberania…").fill("dracão");

  await expect(page.locator(".linha-sistema")).toHaveCount(4);
  await expect(page.locator("#indice-resumo")).toHaveText("4 de 16 sistemas");
});

test("filtra por facção usando os chips", async ({ page }) => {
  await page.getByRole("button", { name: "Companhia do Véu" }).click();

  await expect(page.locator(".linha-sistema")).toHaveCount(3);
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.locator(".linha-sistema")).toHaveCount(16);
});

test("ordena por uma coluna numérica", async ({ page }) => {
  await page.getByRole("button", { name: "Agrupar por região" }).click(); // lista plana
  await page.locator('th[data-coluna="population"]').click(); // crescente
  await page.locator('th[data-coluna="population"]').click(); // decrescente

  await expect(page.locator(".linha-sistema .celula-sistema").first()).toHaveText("Sol");
});

test("marca sistemas classificados", async ({ page }) => {
  const linha = page.locator(".linha-sistema", { hasText: "VEGA" });
  await expect(linha.locator(".marca-classificado")).toBeVisible();
});

test("colapsa e expande um grupo de região", async ({ page }) => {
  const grupo = page.locator(".linha-grupo", { hasText: "VÉU DE LYRA" });
  await grupo.click();
  await expect(page.locator(".linha-sistema")).toHaveCount(12);

  await grupo.click();
  await expect(page.locator(".linha-sistema")).toHaveCount(16);
});

test("clicar numa linha abre o sistema no mapa", async ({ page }) => {
  await page.locator(".linha-sistema", { hasText: "SOL" }).first().click();

  await expect(page).toHaveURL(/\?sistema=\d+/);
  await expect(page.locator("#painel-sistema .painel-sistema__nome")).toHaveText("Sol");
});
