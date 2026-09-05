import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#grupo-sistemas .sistema").first()).toBeVisible();
});

test("desenha os sistemas e as rotas do cenário", async ({ page }) => {
  await expect(page.locator("#grupo-sistemas .sistema")).toHaveCount(16);
  await expect(page.locator("#grupo-rotas .rota")).toHaveCount(19);
  await expect(page.locator("#status-sistemas")).toHaveText("16 sistemas");
});

test("abre o painel do sistema com as três abas", async ({ page }) => {
  await page.locator('[data-sistema] .sistema__nucleo').first().click();

  const painel = page.locator("#painel-sistema");
  await expect(painel).toBeVisible();
  await expect(painel.locator(".aba")).toHaveText(["Visão Geral", "Sistema", "Geopolítica"]);
});

test("mostra corpos celestes e geopolítica de Sol", async ({ page }) => {
  await page.getByPlaceholder("Buscar sistemas").fill("Sol");
  await page.locator(".busca__resultado").first().click();

  const painel = page.locator("#painel-sistema");
  await expect(painel.locator(".painel-sistema__nome")).toHaveText("Sol");
  await expect(painel.locator(".aviso")).toContainText("Autoridade Solar Conjunta");

  await painel.locator('[data-aba="sistema"]').click();
  // Pelo nome exato: "Terra" também aparece na tag "Terraformação parcial" de Marte.
  await expect(painel.locator(".corpo__nome", { hasText: /^Terra$/ })).toBeVisible();
  await expect(painel.locator('.corpo:has(.corpo__nome:text-is("Lua"))')).toHaveClass(
    /corpo--lua/
  );

  await painel.locator('[data-aba="geopolitica"]').click();
  await expect(painel.locator(".equilibrio__fatia")).toHaveCount(2);
  // A população aparece só como número e faixa — sem barra de medidor.
  await expect(painel.locator(".populacao__valor")).toHaveText("14 bi");
  await expect(painel.locator(".populacao")).toContainText("Metrópole estelar");
  await expect(painel.locator(".medidor")).toHaveCount(2); // um por facção
});

test("esconde a geopolítica de um sistema classificado", async ({ page }) => {
  await page.getByPlaceholder("Buscar sistemas").fill("Vega");
  await page.locator(".busca__resultado").first().click();

  const painel = page.locator("#painel-sistema");
  await painel.locator('[data-aba="geopolitica"]').click();
  await expect(painel.locator(".acesso-restrito")).toHaveText("Acesso restrito");
});

test("a busca centraliza o sistema escolhido", async ({ page }) => {
  await page.getByPlaceholder("Buscar sistemas").fill("Arcturus");
  await expect(page.locator(".busca__resultado")).toHaveCount(1);
  await page.locator(".busca__resultado").first().click();

  const centro = await page.evaluate(() => {
    const no = [...document.querySelectorAll("#grupo-sistemas .sistema")].find(
      (item) => item.querySelector("text").textContent === "ARCTURUS"
    );
    const caixa = no.getBoundingClientRect();
    return { x: caixa.x, largura: window.innerWidth };
  });
  expect(Math.abs(centro.x - centro.largura / 2)).toBeLessThan(80);
});

test("as camadas ligam e desligam elementos do mapa", async ({ page }) => {
  await page.locator("#botao-camadas").click();
  const painelCamadas = page.locator("#painel-camadas");
  await expect(painelCamadas).toBeVisible();

  await painelCamadas.locator('[data-camada="rotas"]').uncheck();
  await expect(page.locator("#grupo-rotas")).toHaveCSS("display", "none");

  await painelCamadas.locator('[data-camada="rotas"]').check();
  await expect(page.locator("#grupo-rotas")).not.toHaveCSS("display", "none");
});

test("a camada de influência mostra a legenda das facções", async ({ page }) => {
  await page.locator("#botao-camadas").click();
  await page.locator('[data-camada="influencia"]').check();

  const legenda = page.locator("#legenda");
  await expect(legenda).toBeVisible();
  await expect(legenda.locator(".legenda__item")).toHaveCount(5);
});

test("a roda do mouse aproxima mantendo o mapa na tela", async ({ page }) => {
  const escalaAntes = await page.evaluate(() =>
    Number(document.getElementById("mundo").getAttribute("transform").match(/scale\(([\d.]+)\)/)[1])
  );

  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, -300);

  const escalaDepois = await page.evaluate(() =>
    Number(document.getElementById("mundo").getAttribute("transform").match(/scale\(([\d.]+)\)/)[1])
  );
  expect(escalaDepois).toBeGreaterThan(escalaAntes);
});
