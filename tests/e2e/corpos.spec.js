import { expect, test } from "@playwright/test";

/** Fluxos de corpos celestes: estrelas, ficha, geração e diagrama do sistema. */

async function abrirSistema(page, nome) {
  await page.goto("/");
  await expect(page.locator("#grupo-sistemas .sistema").first()).toBeVisible();
  await page.getByPlaceholder("Buscar sistemas").fill(nome);
  await page.locator(".busca__resultado").first().click();
  await expect(page.locator("#painel-sistema .painel-sistema__nome")).toHaveText(nome);
}

test("o diagrama mostra as três estrelas de um sistema trinário", async ({ page }) => {
  await abrirSistema(page, "Alfa Centauri");

  await expect(page.locator("#painel-sistema h2")).toContainText("Sistema trinário");
  await expect(page.locator(".mapa-sistema__estrela")).toHaveCount(3);
  // Uma <line> horizontal tem altura zero, então o Playwright a considera
  // "invisível": a checagem é de existência, não de visibilidade.
  await expect(page.locator(".mapa-sistema__baricentro")).toHaveCount(1);
});

test("passar o mouse sobre um corpo mostra o nome dele", async ({ page }) => {
  await abrirSistema(page, "Sol");

  const dica = page.locator(".mapa-sistema__dica");
  await expect(dica).toHaveCSS("opacity", "0");

  await page.locator(".mapa-sistema__corpo").nth(1).hover();
  await expect(dica).toHaveClass(/visivel/);
  await expect(dica).not.toHaveText("");
});

test("clicar num corpo do diagrama abre a ficha dele", async ({ page }) => {
  await abrirSistema(page, "Sol");
  await page.locator(".mapa-sistema__corpo").first().click();

  await expect(page.locator(".ficha-corpo__nome")).toHaveText("Sol");
  await expect(page.locator(".ficha-corpo")).toContainText("Amarela (Tipo G)");

  await page.getByRole("button", { name: "← Voltar ao sistema" }).click();
  await expect(page.locator(".ficha-corpo")).toHaveCount(0);
});

test("clicar num corpo da lista abre a ficha com a órbita descrita", async ({ page }) => {
  await abrirSistema(page, "Sol");
  await page.locator('#painel-sistema [data-aba="sistema"]').click();
  await page.locator('.corpo:has(.corpo__nome:text-is("Lua"))').click();

  await expect(page.locator(".ficha-corpo__nome")).toHaveText("Lua");
  await expect(page.locator(".ficha-corpo .estatistica").first()).toContainText("Terra");
});

test("um corpo sem órbita aparece como centro do sistema", async ({ page }) => {
  await abrirSistema(page, "Sol");
  await page.locator('#painel-sistema [data-aba="sistema"]').click();
  await page.locator('.corpo:has(.corpo__nome:text-is("Terra"))').click();

  await expect(page.locator(".ficha-corpo .estatistica").first()).toContainText(
    "centro do sistema"
  );
});

test("o formulário de corpo oferece as classes espectrais só para estrelas", async ({ page }) => {
  await abrirSistema(page, "Wolf 359");
  await page.locator("#botao-editor").click();
  await page.locator('#painel-sistema [data-aba="sistema"]').click();
  await page.getByRole("button", { name: "+ Novo corpo celeste" }).click();

  const dialogo = page.locator("#dialogo-fundo");
  const classe = dialogo.locator(".campo--estrela");

  await expect(classe).toBeHidden(); // padrão é planeta
  await dialogo.locator('[name="body_type"]').selectOption("star");
  await expect(classe).toBeVisible();
  await expect(dialogo.locator('[name="star_class"] option')).toContainText([
    "— não informada —",
    "Azul (Tipo O)",
  ]);

  await dialogo.locator('[data-acao="cancelar"]').click();
});

test("a órbita padrão do formulário é o centro do sistema", async ({ page }) => {
  await abrirSistema(page, "Wolf 359");
  await page.locator("#botao-editor").click();
  await page.locator('#painel-sistema [data-aba="sistema"]').click();
  await page.getByRole("button", { name: "+ Novo corpo celeste" }).click();

  const orbita = page.locator('#dialogo-fundo [name="parent_body_id"]');
  await expect(orbita.locator("option").first()).toHaveText("— centro do sistema —");
  await expect(orbita).toHaveValue("");
});

test("gerar corpos popula um sistema vazio", async ({ page }) => {
  await abrirSistema(page, "Barnard");
  await page.locator("#botao-editor").click();
  await page.locator('#painel-sistema [data-aba="sistema"]').click();

  await page.getByRole("button", { name: "Gerar corpos" }).click();
  await expect(page.locator(".aviso-flutuante--sucesso")).toContainText("gerado");

  await page.locator('#painel-sistema [data-aba="visao"]').click();
  await expect(page.locator(".mapa-sistema__corpo").first()).toBeVisible();

  // devolve o sistema ao estado do cenário
  await page.evaluate(async () => {
    const sistemas = await fetch("/api/systems?busca=Barnard").then((r) => r.json());
    const detalhe = await fetch(`/api/systems/${sistemas[0].id}`).then((r) => r.json());
    for (const corpo of detalhe.bodies.filter((b) => b.body_type !== "star")) {
      await fetch(`/api/systems/${sistemas[0].id}/bodies/${corpo.id}`, { method: "DELETE" });
    }
  });
});

test("sortear preenche população e métricas coerentes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#grupo-sistemas .sistema").first()).toBeVisible();
  await page.locator("#botao-editor").click();
  await page.locator('[data-ferramenta="novo-sistema"]').click();
  await page.mouse.click(1000, 650);

  const dialogo = page.locator("#dialogo-fundo");
  await dialogo.getByRole("button", { name: "Sortear" }).nth(1).click();

  await expect
    .poll(async () => dialogo.locator('[name="economy"]').inputValue())
    .not.toBe("");

  await dialogo.locator('[data-acao="cancelar"]').click();
});
