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

test("os planetas orbitam a estrela, não o centro do sistema", async ({ page }) => {
  await abrirSistema(page, "Sol");
  await page.locator('#painel-sistema [data-aba="sistema"]').click();
  await page.locator('.corpo:has(.corpo__nome:text-is("Terra"))').click();

  await expect(page.locator(".ficha-corpo .estatistica").first()).toContainText("Sol");
});

test("a estrela é o que fica no centro do sistema", async ({ page }) => {
  await abrirSistema(page, "Sol");
  await page.locator('#painel-sistema [data-aba="sistema"]').click();
  await page.locator('.corpo:has(.corpo__nome:text-is("Sol"))').first().click();

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

test("um corpo novo já nasce orbitando a estrela do sistema", async ({ page }) => {
  await abrirSistema(page, "Wolf 359");
  await page.locator("#botao-editor").click();
  await page.locator('#painel-sistema [data-aba="sistema"]').click();
  await page.getByRole("button", { name: "+ Novo corpo celeste" }).click();

  const dialogo = page.locator("#dialogo-fundo");
  const orbita = dialogo.locator('[name="parent_body_id"]');

  // No centro do sistema só ficam estrelas: para um planeta, a opção nem aparece.
  await expect(orbita.locator("option")).toHaveCount(1);
  await expect(orbita.locator("option").first()).toHaveText("Wolf 359");

  // Trocar o tipo para estrela devolve o centro do sistema à lista.
  await dialogo.locator('[name="body_type"]').selectOption("star");
  await expect(orbita.locator("option").first()).toHaveText("— centro do sistema —");
  await expect(orbita).toHaveValue("");

  await dialogo.locator('[data-acao="cancelar"]').click();
});

test("gerar corpos popula um sistema vazio, todos orbitando a estrela", async ({ page }) => {
  await abrirSistema(page, "Barnard");
  await page.locator("#botao-editor").click();
  await page.locator('#painel-sistema [data-aba="sistema"]').click();

  await page.getByRole("button", { name: "Gerar corpos" }).click();
  await expect(page.locator(".aviso-flutuante--sucesso")).toContainText("gerado");

  const orfaos = await page.evaluate(async () => {
    const sistemas = await fetch("/api/systems?busca=Barnard").then((r) => r.json());
    const detalhe = await fetch(`/api/systems/${sistemas[0].id}`).then((r) => r.json());
    const achatar = (corpos) =>
      corpos.flatMap((corpo) => [corpo, ...achatar(corpo.children || [])]);
    return achatar(detalhe.bodies).filter(
      (corpo) => corpo.body_type !== "star" && corpo.parent_body_id === null
    ).length;
  });
  expect(orfaos).toBe(0);

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

async function abrirFormularioDeNovoSistema(page) {
  await page.goto("/");
  await expect(page.locator("#grupo-sistemas .sistema").first()).toBeVisible();
  await page.locator("#botao-editor").click();
  await page.locator('[data-ferramenta="novo-sistema"]').click();
  await page.mouse.click(1000, 650);
  return page.locator("#dialogo-fundo");
}

test("sortear com uma vocação preenche métricas coerentes com ela", async ({ page }) => {
  const dialogo = await abrirFormularioDeNovoSistema(page);

  await dialogo.locator('[name="preset_de_geracao"]').selectOption("capital");
  await dialogo.getByRole("button", { name: "Sortear" }).nth(1).click();

  await expect(dialogo.locator(".campo__ajuda").first()).toContainText("Capital");
  await expect(dialogo.locator('[name="economy"]')).not.toHaveValue("");
  expect(Number(await dialogo.locator('[name="population"]').inputValue())).toBeGreaterThan(
    1_000_000_000
  );

  await dialogo.locator('[data-acao="cancelar"]').click();
});

test("o sorteio avisa o que saiu mesmo quando o sistema é desabitado", async ({ page }) => {
  const dialogo = await abrirFormularioDeNovoSistema(page);

  await dialogo.locator('[name="preset_de_geracao"]').selectOption("ruina");
  await dialogo.getByRole("button", { name: "Sortear" }).nth(1).click();

  // Sem métrica nenhuma para mostrar, a linha de resultado é o único sinal de
  // que o botão funcionou — foi o que fazia parecer que ele estava travado.
  await expect(dialogo.locator(".campo__ajuda").first()).toContainText("Sistema morto");
  await expect(dialogo.locator(".campo__ajuda").first()).toContainText("desabitado");
  await expect(dialogo.locator('[name="economy"]')).toHaveValue("");

  await dialogo.locator('[data-acao="cancelar"]').click();
});
