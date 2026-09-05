import { beforeEach, describe, expect, it, vi } from "vitest";

// O catálogo é carregado da API: aqui a resposta é simulada.
const CATALOGO = {
  classes_de_estrela: [
    { codigo: "G", nome: "Amarela (Tipo G)", resumo: "Como o Sol", cor: "#fff4ea" },
    { codigo: "M", nome: "Anã vermelha (Tipo M)", resumo: "A mais comum", cor: "#ffcc6f" },
  ],
  tipos_de_corpo: [
    { codigo: "planet", nome: "Planeta" },
    { codigo: "moon", nome: "Lua" },
  ],
  metricas: [
    {
      codigo: "economy",
      nome: "Economia",
      faixas: [
        { nome: "Crítico", minimo: 0, maximo: 20, descricao: "Escambo." },
        { nome: "Mediano", minimo: 41, maximo: 60, descricao: "Mercado funcional." },
        { nome: "Excepcional", minimo: 81, maximo: 100, descricao: "Centro econômico." },
      ],
    },
  ],
  tipos_de_rota: [{ codigo: "cosmic_string", nome: "Corda cósmica" }],
  niveis_de_regiao: [{ codigo: "cluster", nome: "Aglomerado" }],
  tendencias: [{ codigo: "steady", nome: "Estável" }],
  faixas_de_populacao: [
    { minimo: 0, nome: "Desabitado" },
    { minimo: 10000, nome: "Colônia" },
    { minimo: 1000000000, nome: "Mundo central" },
  ],
};

vi.mock("../../static/js/modules/shared/api.js", () => ({
  api: { catalogo: vi.fn(async () => CATALOGO) },
}));

const {
  carregarCatalogo,
  corDaEstrela,
  faixaDaMetrica,
  faixaDePopulacao,
  nomeDaClasse,
  nomeDoTipoDeCorpo,
  opcoesDeClasseDeEstrela,
  opcoesDeTipoDeCorpo,
} = await import("../../static/js/modules/shared/catalogo.js");

beforeEach(async () => {
  await carregarCatalogo();
});

describe("carregamento", () => {
  it("busca a API só uma vez, mesmo com chamadas concorrentes", async () => {
    const { api } = await import("../../static/js/modules/shared/api.js");
    api.catalogo.mockClear();

    await Promise.all([carregarCatalogo(), carregarCatalogo(), carregarCatalogo()]);

    expect(api.catalogo).not.toHaveBeenCalled(); // já estava em cache
  });
});

describe("opções para os formulários", () => {
  it("monta pares [codigo, nome]", () => {
    expect(opcoesDeTipoDeCorpo()).toEqual([
      ["planet", "Planeta"],
      ["moon", "Lua"],
    ]);
  });

  it("aceita uma opção vazia na frente", () => {
    expect(opcoesDeClasseDeEstrela("— não informada —")[0]).toEqual([
      "",
      "— não informada —",
    ]);
  });
});

describe("consulta de rótulos", () => {
  it("resolve nome e cor da classe espectral", () => {
    expect(nomeDaClasse("M")).toBe("Anã vermelha (Tipo M)");
    expect(corDaEstrela("G")).toBe("#fff4ea");
  });

  it("tem reserva para código desconhecido", () => {
    expect(nomeDaClasse("XYZ")).toBe("Classe não informada");
    expect(corDaEstrela("")).toBe("#cfd6d0");
    expect(nomeDoTipoDeCorpo("desconhecido")).toBe("desconhecido");
  });
});

describe("faixa da métrica", () => {
  it("encontra a faixa que contém o valor", () => {
    expect(faixaDaMetrica("economy", 10).nome).toBe("Crítico");
    expect(faixaDaMetrica("economy", 50).nome).toBe("Mediano");
    expect(faixaDaMetrica("economy", 100).nome).toBe("Excepcional");
  });

  it("devolve nulo sem dado ou para métrica desconhecida", () => {
    expect(faixaDaMetrica("economy", null)).toBeNull();
    expect(faixaDaMetrica("economy", "")).toBeNull();
    expect(faixaDaMetrica("inexistente", 50)).toBeNull();
  });

  it("devolve nulo quando o valor não cai em nenhuma faixa declarada", () => {
    expect(faixaDaMetrica("economy", 30)).toBeNull();
  });
});

describe("faixa de população", () => {
  it("usa a maior faixa alcançada pelo número", () => {
    expect(faixaDePopulacao(0).nome).toBe("Desabitado");
    expect(faixaDePopulacao(50_000).nome).toBe("Colônia");
    expect(faixaDePopulacao(14_000_000_000).nome).toBe("Mundo central");
  });
});
