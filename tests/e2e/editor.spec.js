import { expect, test } from "@playwright/test";

/** Cada teste do editor cria o que precisa e limpa o que criou pela própria API. */

async function ligarEditor(page) {
  await page.locator("#botao-editor").click();
  await expect(page.locator("#ferramentas-editor")).toBeVisible();
}

async function criarSistema(page, nome, posicao = { x: 1000, y: 650 }) {
  await page.locator('[data-ferramenta="novo-sistema"]').click();
  await page.mouse.click(posicao.x, posicao.y);

  const dialogo = page.locator("#dialogo-fundo");
  await expect(dialogo).toBeVisible();
  await dialogo.locator('[name="name"]').fill(nome);
  await dialogo.locator('[data-acao="salvar"]').click();
  await expect(dialogo).toBeHidden();

  await page.locator('[data-ferramenta="novo-sistema"]').click(); // volta a navegar
  return page.locator(`#grupo-sistemas .sistema`, { hasText: nome.toUpperCase() });
}

async function excluirPelaApi(page, nome) {
  await page.evaluate(async (alvo) => {
    const sistemas = await fetch(`/api/systems?busca=${encodeURIComponent(alvo)}`).then((r) =>
      r.json()
    );
    for (const sistema of sistemas) {
      await fetch(`/api/systems/${sistema.id}`, { method: "DELETE" });
    }
  }, nome);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#grupo-sistemas .sistema").first()).toBeVisible();
  await ligarEditor(page);
});

test("cria um sistema clicando no mapa", async ({ page }) => {
  await criarSistema(page, "Kepler E2E");

  await expect(page.locator("#status-sistemas")).toHaveText("17 sistemas");
  await expect(page.locator("#painel-sistema .painel-sistema__nome")).toHaveText("Kepler E2E");

  await excluirPelaApi(page, "Kepler E2E");
});

test("recusa sistema sem nome e mostra o erro em português", async ({ page }) => {
  await page.locator('[data-ferramenta="novo-sistema"]').click();
  await page.mouse.click(1000, 650);

  const dialogo = page.locator("#dialogo-fundo");
  await dialogo.locator('[data-acao="salvar"]').click();

  await expect(page.locator(".aviso-flutuante--erro")).toContainText("obrigatório");
  await expect(dialogo).toBeVisible();
});

test("arrastar o sistema salva a nova posição", async ({ page }) => {
  const no = await criarSistema(page, "Kepler Arrasto");
  await page.locator(".painel-sistema__fechar").click();

  const antes = await no.boundingBox();
  await page.mouse.move(antes.x + 4, antes.y + antes.height / 2);
  await page.mouse.down();
  await page.mouse.move(antes.x + 124, antes.y + antes.height / 2 - 60, { steps: 8 });
  await page.mouse.up();

  await page.waitForResponse((resposta) => resposta.url().includes("/position"));
  await page.reload();

  const depois = await page
    .locator("#grupo-sistemas .sistema", { hasText: "KEPLER ARRASTO" })
    .boundingBox();
  expect(Math.abs(depois.x - antes.x)).toBeGreaterThan(40);

  await excluirPelaApi(page, "Kepler Arrasto");
});

test("conecta dois sistemas com a ferramenta de rota", async ({ page }) => {
  await criarSistema(page, "Kepler Rota");
  await page.locator(".painel-sistema__fechar").click();

  await page.locator('[data-ferramenta="conectar"]').click();
  await page
    .locator("#grupo-sistemas .sistema", { hasText: "KEPLER ROTA" })
    .locator(".sistema__nucleo")
    .click();
  await expect(page.locator(".aviso-flutuante")).toContainText("segundo sistema");

  await page
    .locator("#grupo-sistemas .sistema", { hasText: "SOL" })
    .locator(".sistema__nucleo")
    .click();

  const dialogo = page.locator("#dialogo-fundo");
  await expect(dialogo.locator(".dialogo__titulo")).toHaveText("Nova rota");
  await dialogo.locator('[name="lane_type"]').selectOption("trade_route");
  await dialogo.locator('[data-acao="salvar"]').click();

  await expect(page.locator("#status-rotas")).toHaveText("20 rotas");

  await excluirPelaApi(page, "Kepler Rota");
});

test("excluir o sistema avisa o impacto e remove em cascata", async ({ page }) => {
  await criarSistema(page, "Kepler Cascata");
  await page.locator(".painel-sistema__fechar").click();

  // liga uma rota para o impacto ter o que relatar
  await page.locator('[data-ferramenta="conectar"]').click();
  await page
    .locator("#grupo-sistemas .sistema", { hasText: "KEPLER CASCATA" })
    .locator(".sistema__nucleo")
    .click();
  await page.locator("#grupo-sistemas .sistema", { hasText: "SOL" }).locator(".sistema__nucleo").click();
  await page.locator('#dialogo-fundo [data-acao="salvar"]').click();
  await page.locator('[data-ferramenta="conectar"]').click();

  await page
    .locator("#grupo-sistemas .sistema", { hasText: "KEPLER CASCATA" })
    .locator(".sistema__nucleo")
    .click();
  await page.locator("#painel-sistema .painel-sistema__rodape .botao--perigo").click();

  const dialogo = page.locator("#dialogo-fundo");
  await expect(dialogo.locator(".dialogo__impacto")).toContainText("1 rota(s)");
  await dialogo.locator('[data-acao="confirmar"]').click();

  await expect(page.locator("#status-sistemas")).toHaveText("16 sistemas");
  await expect(page.locator("#status-rotas")).toHaveText("19 rotas");
  await expect(page.locator("#painel-sistema")).toBeHidden();
});

test("edita campos do sistema pelo painel lateral", async ({ page }) => {
  await criarSistema(page, "Kepler Edição");

  await page.locator("#painel-sistema .botao--primario").click();
  await page.locator('#painel-sistema [name="lore_text"]').fill("Reescrito pelo teste.");
  await page.locator('#painel-sistema [name="star_type"]').fill("Anã vermelha M3V");
  await page.locator("#painel-sistema .dialogo__acoes .botao--primario").click();

  await expect(page.locator(".painel-sistema__lore")).toHaveText("Reescrito pelo teste.");

  await excluirPelaApi(page, "Kepler Edição");
});

test("adiciona e remove um corpo celeste", async ({ page }) => {
  await criarSistema(page, "Kepler Corpos");
  await page.locator('#painel-sistema [data-aba="sistema"]').click();
  await page.getByRole("button", { name: "+ Novo corpo celeste" }).click();

  const dialogo = page.locator("#dialogo-fundo");
  await dialogo.locator('[name="name"]').fill("Nova Terra");
  await dialogo.locator('[name="tags"]').fill("Mundo oceânico, Habitável");
  await dialogo.locator('[data-acao="salvar"]').click();

  const corpo = page.locator("#painel-sistema .corpo", { hasText: "Nova Terra" });
  await expect(corpo).toBeVisible();
  await expect(corpo.locator(".corpo__tags")).toHaveText("Habitável, Mundo oceânico");

  await corpo.locator(".botao--perigo").click();
  await page.locator('#dialogo-fundo [data-acao="confirmar"]').click();
  await expect(page.locator("#painel-sistema .corpo", { hasText: "Nova Terra" })).toHaveCount(0);

  await excluirPelaApi(page, "Kepler Corpos");
});
