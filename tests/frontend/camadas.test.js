import { beforeEach, describe, expect, it, vi } from "vitest";

import { criarGerenciadorCamadas } from "../../static/js/modules/map/camadas.js";

function camadaFalsa(id, visivel = true) {
  return { id, rotulo: id.toUpperCase(), visivel, desenhar: vi.fn() };
}

beforeEach(() => {
  localStorage.clear();
});

describe("registro de camadas", () => {
  it("mantém a ordem de registro", () => {
    const gerenciador = criarGerenciadorCamadas()
      .registrar(camadaFalsa("rotas"))
      .registrar(camadaFalsa("sistemas"));

    expect(gerenciador.listar().map((c) => c.id)).toEqual(["rotas", "sistemas"]);
  });

  it("respeita a visibilidade inicial declarada", () => {
    const gerenciador = criarGerenciadorCamadas().registrar(camadaFalsa("influencia", false));
    expect(gerenciador.estaVisivel("influencia")).toBe(false);
  });
});

describe("alternar visibilidade", () => {
  it("alterna e notifica os ouvintes", () => {
    const gerenciador = criarGerenciadorCamadas().registrar(camadaFalsa("rotas"));
    const ouvinte = vi.fn();
    gerenciador.aoMudar(ouvinte);

    gerenciador.alternar("rotas");

    expect(gerenciador.estaVisivel("rotas")).toBe(false);
    expect(ouvinte).toHaveBeenCalledWith("rotas", false);
  });

  it("ignora camadas desconhecidas sem quebrar", () => {
    const gerenciador = criarGerenciadorCamadas();
    expect(() => gerenciador.definirVisibilidade("inexistente", true)).not.toThrow();
    expect(gerenciador.estaVisivel("inexistente")).toBe(false);
  });

  it("guarda a escolha e reaplica num gerenciador novo", () => {
    criarGerenciadorCamadas().registrar(camadaFalsa("rotas")).alternar("rotas");

    const outro = criarGerenciadorCamadas().registrar(camadaFalsa("rotas"));
    expect(outro.estaVisivel("rotas")).toBe(false);
  });
});

describe("desenho e legenda", () => {
  it("chama cada camada informando se está visível", () => {
    const rotas = camadaFalsa("rotas");
    const influencia = camadaFalsa("influencia", false);
    const gerenciador = criarGerenciadorCamadas().registrar(rotas).registrar(influencia);

    gerenciador.desenhar({ contexto: true });

    expect(rotas.desenhar).toHaveBeenCalledWith({ contexto: true }, true);
    expect(influencia.desenhar).toHaveBeenCalledWith({ contexto: true }, false);
  });

  it("junta apenas a legenda das camadas visíveis", () => {
    const gerenciador = criarGerenciadorCamadas()
      .registrar({
        ...camadaFalsa("influencia"),
        legenda: () => [{ rotulo: "Facção A", cor: "#fff" }],
      })
      .registrar({
        ...camadaFalsa("pirataria", false),
        legenda: () => [{ rotulo: "Piratas", cor: "#f00" }],
      });

    expect(gerenciador.legenda()).toEqual([{ rotulo: "Facção A", cor: "#fff" }]);
  });
});

describe("controles no DOM", () => {
  it("monta um checkbox por camada, com o estado atual", () => {
    const gerenciador = criarGerenciadorCamadas()
      .registrar(camadaFalsa("rotas"))
      .registrar(camadaFalsa("influencia", false));

    const container = document.createElement("div");
    gerenciador.montarControles(container);

    const entradas = [...container.querySelectorAll("input")];
    expect(entradas).toHaveLength(2);
    expect(entradas[0].checked).toBe(true);
    expect(entradas[1].checked).toBe(false);
  });

  it("alterna a camada quando o checkbox muda", () => {
    const gerenciador = criarGerenciadorCamadas().registrar(camadaFalsa("rotas"));
    const container = document.createElement("div");
    gerenciador.montarControles(container);

    const entrada = container.querySelector("input");
    entrada.checked = false;
    entrada.dispatchEvent(new Event("change"));

    expect(gerenciador.estaVisivel("rotas")).toBe(false);
  });
});
