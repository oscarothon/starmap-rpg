import { expect, test } from "@playwright/test";

/** Seleção de rota no mapa: painel com a descrição, legenda e edição. */

/** Id da rota entre dois sistemas, pelo nome — o mapa não expõe isso na tela. */
async function idDaRota(page, origem, destino) {
  return page.evaluate(async ([a, b]) => {
    const mapa = await fetch("/api/map").then((r) => r.json());
    const porNome = Object.fromEntries(mapa.systems.map((s) => [s.name, s.id]));
    const rota = mapa.lanes.find(
      (l) =>
        (l.system_a_id === porNome[a] && l.system_b_id === porNome[b]) ||
        (l.system_a_id === porNome[b] && l.system_b_id === porNome[a])
    );
    return rota ? rota.id : null;
  }, [origem, destino]);
}

async function selecionarRota(page, origem, destino) {
  const id = await idDaRota(page, origem, destino);
  expect(id).not.toBeNull();
  await page.locator(`[data-rota="${id}"]`).click();
  return id;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#grupo-sistemas .sistema").first()).toBeVisible();
});

test("clicar numa rota mostra o tipo e a descrição dela", async ({ page }) => {
  await selecionarRota(page, "Sol", "Alfa Centauri");

  const painel = page.locator("#painel-rota");
  await expect(painel).toBeVisible();
  await expect(painel.locator(".painel-rota__titulo")).toContainText("Sol");
  await expect(painel.locator(".painel-rota__titulo")).toContainText("Alfa Centauri");
  await expect(painel).toContainText("Hyperlane");
  await expect(painel).toContainText("primeira rota aberta pela humanidade");
});

test("rota sem descrição diz isso, em vez de ficar vazia", async ({ page }) => {
  await selecionarRota(page, "Sol", "Wolf 359");

  await expect(page.locator("#painel-rota")).toContainText("Sem descrição registrada");
});

test("a rota selecionada fica destacada e o ESC fecha o painel", async ({ page }) => {
  const id = await selecionarRota(page, "Orcus", "Ismarus");

  await expect(page.locator(`[data-rota="${id}"]`)).toHaveClass(/rota-grupo--selecionada/);

  await page.keyboard.press("Escape");
  await expect(page.locator("#painel-rota")).toBeHidden();
  await expect(page.locator(`[data-rota="${id}"]`)).not.toHaveClass(
    /rota-grupo--selecionada/
  );
});

test("as ações de edição só aparecem no modo editor", async ({ page }) => {
  await selecionarRota(page, "Sol", "Sirius");
  await expect(page.locator("#painel-rota").getByRole("button", { name: "Editar rota" })).toHaveCount(0);

  await page.locator("#botao-editor").click();
  await expect(page.locator("#painel-rota").getByRole("button", { name: "Editar rota" })).toBeVisible();
});

test("editar a rota pelo painel troca o tipo e a descrição", async ({ page }) => {
  await page.locator("#botao-editor").click();
  const id = await selecionarRota(page, "Barnard", "Tau Ceti");

  await page.locator("#painel-rota").getByRole("button", { name: "Editar rota" }).click();

  const dialogo = page.locator("#dialogo-fundo");
  await dialogo.locator('[name="lane_type"]').selectOption("unstable");
  await dialogo.locator('[name="notes"]').fill("Trecho remendado depois do colapso.");
  await dialogo.locator('[data-acao="salvar"]').click();

  await expect(page.locator("#painel-rota")).toContainText("Trecho remendado");
  await expect(page.locator("#painel-rota")).toContainText("Instável");

  // devolve a rota ao estado do cenário
  await page.evaluate(async (rotaId) => {
    await fetch(`/api/lanes/${rotaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lane_type: "hyperlane", notes: "" }),
    });
  }, id);
});

test("o formulário de rota não oferece mais mão dupla", async ({ page }) => {
  await page.locator("#botao-editor").click();
  await selecionarRota(page, "Sol", "Epsilon Eridani");
  await page.locator("#painel-rota").getByRole("button", { name: "Editar rota" }).click();

  const dialogo = page.locator("#dialogo-fundo");
  await expect(dialogo.locator('[name="lane_type"]')).toBeVisible();
  await expect(dialogo.locator('[name="bidirectional"]')).toHaveCount(0);

  await dialogo.locator('[data-acao="cancelar"]').click();
});

test("a legenda explica o tracejado de cada tipo de rota presente no mapa", async ({ page }) => {
  const legenda = page.locator("#legenda");

  await expect(legenda).toBeVisible();
  await expect(legenda).toContainText("Hyperlane");
  await expect(legenda).toContainText("Rota comercial");
  await expect(legenda).toContainText("Instável");
  await expect(legenda).toContainText("Restrita");
  await expect(legenda.locator(".legenda__amostra")).toHaveCount(4);
});

test("desligar a camada de rotas tira a legenda delas", async ({ page }) => {
  await page.locator("#botao-camadas").click();
  await page.locator('[data-camada="rotas"]').uncheck();

  await expect(page.locator("#legenda")).toBeHidden();

  await page.locator('[data-camada="rotas"]').check();
  await expect(page.locator("#legenda")).toBeVisible();
});
