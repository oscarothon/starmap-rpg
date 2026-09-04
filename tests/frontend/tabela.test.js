import { describe, expect, it } from "vitest";

import {
  agruparPorRegiao,
  filtrar,
  ordenar,
  proximaOrdenacao,
} from "../../static/js/modules/index/tabela.js";

const SISTEMAS = [
  {
    id: 1,
    name: "Sol",
    region_name: "Subaglomerado Solar",
    region_path: [{ name: "Subaglomerado Solar" }, { name: "Aglomerado Local" }],
    faction_id: 1,
    faction_name: "Autoridade Solar Conjunta",
    population: 14_000_000_000,
    economy: 98,
  },
  {
    id: 2,
    name: "Arcturus",
    region_name: "Véu de Lyra",
    region_path: [{ name: "Véu de Lyra" }, { name: "Fronteira de Órion" }],
    faction_id: 2,
    faction_name: "Companhia do Véu",
    population: 1_100_000_000,
    economy: 46,
  },
  {
    id: 3,
    name: "Barnard",
    region_name: "Subaglomerado Solar",
    region_path: [{ name: "Subaglomerado Solar" }, { name: "Aglomerado Local" }],
    faction_id: null,
    faction_name: null,
    population: 340_000,
    economy: null,
  },
];

describe("filtrar", () => {
  it("devolve tudo quando não há filtro", () => {
    expect(filtrar(SISTEMAS)).toHaveLength(3);
  });

  it("busca por nome do sistema, sem diferenciar maiúsculas", () => {
    expect(filtrar(SISTEMAS, { busca: "ARCTUR" }).map((s) => s.name)).toEqual(["Arcturus"]);
  });

  it("casa o termo em qualquer campo, não só no nome", () => {
    // "sol" aparece no nome de Sol e na região de Barnard (Subaglomerado Solar).
    expect(filtrar(SISTEMAS, { busca: "sol" }).map((s) => s.name)).toEqual(["Sol", "Barnard"]);
  });

  it("busca também por região e soberania", () => {
    expect(filtrar(SISTEMAS, { busca: "véu" }).map((s) => s.name)).toEqual(["Arcturus"]);
    expect(filtrar(SISTEMAS, { busca: "autoridade" }).map((s) => s.name)).toEqual(["Sol"]);
  });

  it("filtra por facção escolhida", () => {
    expect(filtrar(SISTEMAS, { faccoes: [2] }).map((s) => s.name)).toEqual(["Arcturus"]);
  });

  it("trata o id 0 como filtro de independentes", () => {
    expect(filtrar(SISTEMAS, { faccoes: [0] }).map((s) => s.name)).toEqual(["Barnard"]);
  });

  it("combina busca textual e filtro de facção", () => {
    expect(filtrar(SISTEMAS, { busca: "sol", faccoes: [2] })).toEqual([]);
  });
});

describe("ordenar", () => {
  it("ordena texto em ordem alfabética do português", () => {
    expect(ordenar(SISTEMAS, "name").map((s) => s.name)).toEqual(["Arcturus", "Barnard", "Sol"]);
  });

  it("inverte a ordem quando pedido decrescente", () => {
    expect(ordenar(SISTEMAS, "name", "desc").map((s) => s.name)).toEqual([
      "Sol",
      "Barnard",
      "Arcturus",
    ]);
  });

  it("ordena números pelo valor, não pelo texto", () => {
    expect(ordenar(SISTEMAS, "population", "desc").map((s) => s.name)).toEqual([
      "Sol",
      "Arcturus",
      "Barnard",
    ]);
  });

  it("mantém sistemas sem dado no fim nas duas direções", () => {
    expect(ordenar(SISTEMAS, "economy").at(-1).name).toBe("Barnard");
    expect(ordenar(SISTEMAS, "economy", "desc").at(-1).name).toBe("Barnard");
  });

  it("não altera a lista original", () => {
    const copia = [...SISTEMAS];
    ordenar(SISTEMAS, "name", "desc");
    expect(SISTEMAS).toEqual(copia);
  });
});

describe("agruparPorRegiao", () => {
  it("agrupa pela região local do sistema", () => {
    const grupos = agruparPorRegiao(SISTEMAS);
    expect(grupos.map((g) => g.nome)).toEqual(["Subaglomerado Solar", "Véu de Lyra"]);
    expect(grupos[0].sistemas.map((s) => s.name)).toEqual(["Sol", "Barnard"]);
  });

  it("junta sistemas sem região em um grupo próprio", () => {
    const grupos = agruparPorRegiao([{ name: "Perdido", region_path: [], region_name: null }]);
    expect(grupos[0].nome).toBe("Sem região");
  });
});

describe("proximaOrdenacao", () => {
  it("começa crescente numa coluna nova", () => {
    expect(proximaOrdenacao({ campo: "name", direcao: "asc" }, "population")).toEqual({
      campo: "population",
      direcao: "asc",
    });
  });

  it("alterna a direção na mesma coluna", () => {
    expect(proximaOrdenacao({ campo: "name", direcao: "asc" }, "name")).toEqual({
      campo: "name",
      direcao: "desc",
    });
  });
});
