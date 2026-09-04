/**
 * Formulários de edição: sistema, corpo celeste e influências.
 *
 * Cada formulário devolve { elemento, valores() } — quem chama decide o que
 * fazer com os valores (criar ou atualizar). Acrescentar um campo novo é
 * acrescentar uma linha na lista de campos.
 */

import { el } from "../shared/dom.js";

export const TIPOS_DE_CORPO = [
  ["planet", "Planeta"],
  ["moon", "Lua"],
  ["station", "Estação"],
  ["belt", "Cinturão"],
  ["star", "Estrela"],
  ["anomaly", "Anomalia"],
];

export const TIPOS_DE_ROTA = [
  ["cosmic_string", "Corda cósmica"],
  ["trade_route", "Rota comercial"],
  ["unstable", "Instável"],
  ["restricted", "Restrita"],
];

export const TENDENCIAS = [
  ["rising", "Em alta"],
  ["steady", "Estável"],
  ["falling", "Em queda"],
];

export const METRICAS = [
  ["economy", "Economia"],
  ["industry", "Indústria"],
  ["innovation", "Inovação"],
  ["information", "Informação"],
  ["stability", "Estabilidade"],
  ["quality_of_life", "Qualidade de vida"],
];

function campoTexto(rotulo, nome, valor = "", opcoes = {}) {
  const entrada = el("input", {
    type: opcoes.tipo || "text",
    name: nome,
    value: valor ?? "",
    ...(opcoes.min !== undefined ? { min: opcoes.min } : {}),
    ...(opcoes.max !== undefined ? { max: opcoes.max } : {}),
    ...(opcoes.step !== undefined ? { step: opcoes.step } : {}),
  });
  return el("label", { classe: "campo" }, [el("span", { texto: rotulo }), entrada]);
}

function campoArea(rotulo, nome, valor = "") {
  const area = el("textarea", { name: nome });
  area.value = valor ?? "";
  return el("label", { classe: "campo" }, [el("span", { texto: rotulo }), area]);
}

function campoSelecao(rotulo, nome, opcoes, valorAtual) {
  const select = el("select", { name: nome });
  for (const [valor, texto] of opcoes) {
    const opcao = el("option", { value: valor, texto });
    if (String(valor) === String(valorAtual ?? "")) opcao.selected = true;
    select.appendChild(opcao);
  }
  return el("label", { classe: "campo" }, [el("span", { texto: rotulo }), select]);
}

function campoBooleano(rotulo, nome, marcado) {
  const entrada = el("input", { type: "checkbox", name: nome });
  entrada.checked = Boolean(marcado);
  return el("label", { classe: "camada-item" }, [entrada, el("span", { texto: rotulo })]);
}

function texto(formulario, nome) {
  const campo = formulario.querySelector(`[name="${nome}"]`);
  return campo ? campo.value.trim() : "";
}

function numeroOuNulo(formulario, nome) {
  const valor = texto(formulario, nome);
  return valor === "" ? null : Number(valor);
}

/** Formulário principal do sistema estelar. */
export function formularioSistema(sistema = {}, { regioes = [], faccoes = [] } = {}) {
  const opcoesRegiao = [["", "— sem região —"], ...regioes.map((r) => [r.id, r.name])];
  const opcoesFaccao = [["", "— independente —"], ...faccoes.map((f) => [f.id, f.name])];

  const elemento = el("form", { classe: "formulario", onSubmit: (e) => e.preventDefault() }, [
    campoTexto("Nome", "name", sistema.name || ""),
    campoSelecao("Região", "region_id", opcoesRegiao, sistema.region_id),
    campoSelecao("Soberania", "sovereign_faction_id", opcoesFaccao, sistema.sovereign_faction_id),
    el("div", { classe: "grade-dupla" }, [
      campoTexto("Tipo da estrela", "star_type", sistema.star_type || ""),
      campoTexto("Nº de estrelas", "star_count", sistema.star_count ?? 1, {
        tipo: "number",
        min: 1,
      }),
    ]),
    campoTexto("População", "population", sistema.population ?? 0, { tipo: "number", min: 0 }),
    campoArea("Descrição", "lore_text", sistema.lore_text || ""),
    campoArea("Aviso em destaque", "notice_text", sistema.notice_text || ""),
    el("div", { classe: "secao__titulo rotulo", texto: "Métricas (0 a 100)" }),
    ...METRICAS.map(([chave, rotulo]) =>
      campoTexto(rotulo, chave, sistema[chave] ?? "", { tipo: "number", min: 0, max: 100 })
    ),
    campoBooleano("Sistema classificado", "is_classified", sistema.is_classified),
  ]);

  return {
    elemento,
    valores() {
      const dados = {
        name: texto(elemento, "name"),
        region_id: numeroOuNulo(elemento, "region_id"),
        sovereign_faction_id: numeroOuNulo(elemento, "sovereign_faction_id"),
        star_type: texto(elemento, "star_type"),
        star_count: Number(texto(elemento, "star_count") || 1),
        population: Number(texto(elemento, "population") || 0),
        lore_text: texto(elemento, "lore_text"),
        notice_text: texto(elemento, "notice_text"),
        is_classified: elemento.querySelector('[name="is_classified"]').checked,
      };
      for (const [chave] of METRICAS) dados[chave] = numeroOuNulo(elemento, chave);
      return dados;
    },
  };
}

/** Formulário de corpo celeste (usado no diálogo de criar/editar). */
export function formularioCorpo(corpo = {}, { corposDoSistema = [] } = {}) {
  const opcoesOrbita = [
    ["", "— orbita a estrela —"],
    ...corposDoSistema
      .filter((item) => item.id !== corpo.id && item.body_type !== "moon")
      .map((item) => [item.id, item.name]),
  ];

  const elemento = el("form", { classe: "formulario", onSubmit: (e) => e.preventDefault() }, [
    campoTexto("Nome", "name", corpo.name || ""),
    campoSelecao("Tipo", "body_type", TIPOS_DE_CORPO, corpo.body_type || "planet"),
    campoSelecao("Orbita", "parent_body_id", opcoesOrbita, corpo.parent_body_id),
    el("div", { classe: "grade-dupla" }, [
      campoTexto("Ordem orbital", "orbital_order", corpo.orbital_order ?? 0, {
        tipo: "number",
      }),
      campoTexto("Raio orbital (UA)", "orbital_radius_au", corpo.orbital_radius_au ?? "", {
        tipo: "number",
        step: "0.01",
        min: 0,
      }),
    ]),
    campoTexto("Tags (separadas por vírgula)", "tags", (corpo.tags || []).join(", ")),
    campoArea("Descrição", "description", corpo.description || ""),
    campoBooleano("Colonizado", "is_colonized", corpo.is_colonized),
  ]);

  return {
    elemento,
    valores() {
      return {
        name: texto(elemento, "name"),
        body_type: texto(elemento, "body_type"),
        parent_body_id: numeroOuNulo(elemento, "parent_body_id"),
        orbital_order: Number(texto(elemento, "orbital_order") || 0),
        orbital_radius_au: numeroOuNulo(elemento, "orbital_radius_au"),
        description: texto(elemento, "description"),
        is_colonized: elemento.querySelector('[name="is_colonized"]').checked,
        tags: texto(elemento, "tags")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
    },
  };
}

/** Editor das influências de facção de um sistema. */
export function formularioInfluencias(influencias = [], faccoes = []) {
  const linhas = el("div", { classe: "influencias" });

  function adicionarLinha(influencia = {}) {
    const opcoesFaccao = faccoes.map((f) => [f.id, f.name]);
    const linha = el("div", { classe: "influencia-linha" }, [
      campoSelecao("Facção", "faction_id", opcoesFaccao, influencia.faction_id),
      campoTexto("Influência", "influence_value", influencia.influence_value ?? 0, {
        tipo: "number",
        min: 0,
        max: 100,
      }),
      campoSelecao("Tendência", "trend", TENDENCIAS, influencia.trend || "steady"),
      campoTexto("Rótulo", "qualitative_label", influencia.qualitative_label || ""),
      el("button", {
        classe: "botao botao--perigo",
        type: "button",
        texto: "Remover",
        onClick: () => linha.remove(),
      }),
    ]);
    linhas.appendChild(linha);
  }

  influencias.forEach(adicionarLinha);

  const elemento = el("div", {}, [
    linhas,
    el("button", {
      classe: "botao",
      type: "button",
      texto: "+ Facção",
      onClick: () => adicionarLinha(),
    }),
  ]);

  return {
    elemento,
    valores() {
      return [...linhas.querySelectorAll(".influencia-linha")]
        .map((linha) => ({
          faction_id: numeroOuNulo(linha, "faction_id"),
          influence_value: Number(texto(linha, "influence_value") || 0),
          trend: texto(linha, "trend"),
          qualitative_label: texto(linha, "qualitative_label"),
        }))
        .filter((item) => item.faction_id !== null);
    },
  };
}

/** Formulário de rota, mostrado ao ligar dois sistemas no mapa. */
export function formularioRota(rota = {}) {
  const elemento = el("form", { classe: "formulario", onSubmit: (e) => e.preventDefault() }, [
    campoSelecao("Tipo da rota", "lane_type", TIPOS_DE_ROTA, rota.lane_type || "cosmic_string"),
    campoTexto("Observações", "notes", rota.notes || ""),
    campoBooleano("Mão dupla", "bidirectional", rota.bidirectional ?? true),
  ]);

  return {
    elemento,
    valores() {
      return {
        lane_type: texto(elemento, "lane_type"),
        notes: texto(elemento, "notes"),
        bidirectional: elemento.querySelector('[name="bidirectional"]').checked,
      };
    },
  };
}
