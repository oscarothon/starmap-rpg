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

test("mostra a amostra do traço de cada tipo de rota", async ({ page }) => {
  const hyperlane = page.locator("#rotas .cartao", { hasText: "Hyperlane" });

  await expect(hyperlane).toBeVisible();
  await expect(hyperlane.locator(".amostra-rota .rota--hyperlane")).toHaveCount(1);
  await expect(page.locator("#rotas .amostra-rota")).toHaveCount(4);
});

test("explica os arranjos de sistemas múltiplos", async ({ page }) => {
  const binaria = page.locator("#arranjos .cartao", { hasText: "Binária estreita" });

  await expect(binaria).toContainText("circumbinárias");
  await expect(binaria.locator(".cartao__dado")).toContainText("2 estrelas");
});

test("lista as vocações de sistema com as métricas que cada uma puxa", async ({ page }) => {
  const militar = page.locator("#presets .cartao", { hasText: "Bastião militar" });

  await expect(militar).toBeVisible();
  await expect(militar.locator(".etiqueta--alta")).toContainText(["Estabilidade ↑"]);
  await expect(militar.locator(".etiqueta--baixa")).toContainText(["Qualidade de vida ↓"]);
});

test("a faixa de população não invade a coluna ao lado", async ({ page }) => {
  // O bug era visual: "10.000.000.000+" não cabia na coluna estreita das
  // métricas e passava por cima do nome da faixa.
  const faixa = page.locator("#populacao .faixa").last();
  const intervalo = await faixa.locator(".faixa__intervalo").boundingBox();
  const nome = await faixa.locator(".faixa__nome").boundingBox();

  await expect(faixa.locator(".faixa__intervalo")).toHaveText("10.000.000.000+");
  expect(intervalo.x + intervalo.width).toBeLessThanOrEqual(nome.x);
});

test("o índice leva até a seção escolhida", async ({ page }) => {
  await page.getByRole("link", { name: "Tipos de rota" }).click();

  await expect
    .poll(async () => page.evaluate(() => document.scrollingElement.scrollTop))
    .toBeGreaterThan(100);
});
