import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/glossario");
  await expect(page.locator("#estrelas .cartao").first()).toBeVisible();
});

test("lista as classes de estrela com descrição e temperatura", async ({ page }) => {
  const cartao = page.locator("#estrelas .cartao", { hasText: "Amarela (Tipo G)" });

  await expect(cartao).toBeVisible();
  await expect(cartao).toContainText("a mesma classe do Sol");
  await expect(cartao.locator(".cartao__dado")).toContainText("5.200 a 6.000 K");
});

test("explica cada métrica em cinco faixas", async ({ page }) => {
  const economia = page.locator(".metrica", { hasText: "Economia" });

  await expect(economia.locator(".faixa")).toHaveCount(5);
  await expect(economia.locator(".faixa").first()).toContainText("0–20");
  await expect(economia.locator(".faixa").first()).toContainText("Crítico");
  await expect(economia.locator(".faixa").last()).toContainText("Excepcional");
});

test("cobre também corpos, rotas, regiões e população", async ({ page }) => {
  await expect(page.locator("#corpos .cartao")).toHaveCount(6);
  await expect(page.locator("#rotas .cartao")).toHaveCount(4);
  await expect(page.locator("#regioes .cartao")).toHaveCount(4);
  await expect(page.locator("#populacao .faixa")).toHaveCount(6);
});

test("o índice leva até a seção escolhida", async ({ page }) => {
  await page.getByRole("link", { name: "Tipos de rota" }).click();

  await expect
    .poll(async () => page.evaluate(() => document.scrollingElement.scrollTop))
    .toBeGreaterThan(100);
});
