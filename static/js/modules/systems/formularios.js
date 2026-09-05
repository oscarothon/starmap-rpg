/**
 * Formulários de edição: sistema, corpo celeste, influências e rota.
 *
 * Cada formulário devolve { elemento, valores() } — quem chama decide o que
 * fazer com os valores. As listas de opções vêm do catálogo
 * (`shared/catalogo.js`), então acrescentar um tipo de estrela é editar o
 * backend, não este arquivo.
 */

import { api } from "../shared/api.js";
import {
  faixaDaMetrica,
  opcoesDeClasseDeEstrela,
  opcoesDePreset,
  opcoesDeTendencia,
  opcoesDeTipoDeCorpo,
  opcoesDeTipoDeRota,
} from "../shared/catalogo.js";
import { el, limpar } from "../shared/dom.js";
import { notificarErro } from "../shared/notificacoes.js";

export const METRICAS = [
  ["economy", "Economia"],
  ["industry", "Indústria"],
  ["innovation", "Inovação"],
  ["information", "Informação"],
  ["stability", "Estabilidade"],
  ["quality_of_life", "Qualidade de vida"],
];

/** Rótulo da órbita quando o corpo não orbita nenhum outro. */
export const CENTRO_DO_SISTEMA = "— centro do sistema —";

function campoTexto(rotulo, nome, valor = "", opcoes = {}) {
  const entrada = el("input", {
    type: opcoes.tipo || "text",
    name: nome,
    value: valor ?? "",
    ...(opcoes.min !== undefined ? { min: opcoes.min } : {}),
    ...(opcoes.max !== undefined ? { max: opcoes.max } : {}),
    ...(opcoes.step !== undefined ? { step: opcoes.step } : {}),
  });
  return el("label", { classe: "campo" }, [
    el("span", { texto: rotulo }),
    opcoes.acessorio ? el("div", { classe: "campo__linha" }, [entrada, opcoes.acessorio]) : entrada,
  ]);
}

function campoArea(rotulo, nome, valor = "") {
  const area = el("textarea", { name: nome });
  area.value = valor ?? "";
  return el("label", { classe: "campo" }, [el("span", { texto: rotulo }), area]);
}

function campoSelecao(rotulo, nome, opcoes, valorAtual, extras = {}) {
  const select = el("select", { name: nome, ...(extras.atributos || {}) });
  for (const [valor, texto] of opcoes) {
    const opcao = el("option", { value: valor, texto });
    if (String(valor) === String(valorAtual ?? "")) opcao.selected = true;
    select.appendChild(opcao);
  }
  return el("label", { classe: `campo ${extras.classe || ""}` }, [
    el("span", { texto: rotulo }),
    select,
  ]);
}

function campoBooleano(rotulo, nome, marcado) {
  const entrada = el("input", { type: "checkbox", name: nome });
  entrada.checked = Boolean(marcado);
  return el("label", { classe: "camada-item" }, [entrada, el("span", { texto: rotulo })]);
}

/**
 * Botão de sorteio com estado de trabalho.
 *
 * O sorteio é uma ida ao servidor: sem sinal de que está em curso, a espera
 * parece travamento e o usuário clica de novo. Enquanto a resposta não chega o
 * botão fica desabilitado, então cliques repetidos não empilham requisições.
 */
function botaoSortear(titulo, aoClicar) {
  const botao = el("button", {
    classe: "botao botao--sortear",
    type: "button",
    texto: "Sortear",
    title: titulo,
  });

  botao.addEventListener("click", async () => {
    if (botao.disabled) return;
    botao.disabled = true;
    botao.classList.add("botao--ocupado");
    botao.textContent = "Sorteando…";
    try {
      await aoClicar();
    } finally {
      botao.disabled = false;
      botao.classList.remove("botao--ocupado");
      botao.textContent = "Sortear";
    }
  });

  return botao;
}

function texto(formulario, nome) {
  const campo = formulario.querySelector(`[name="${nome}"]`);
  return campo ? campo.value.trim() : "";
}

function numeroOuNulo(formulario, nome) {
  const valor = texto(formulario, nome);
  return valor === "" ? null : Number(valor);
}

function definir(formulario, nome, valor) {
  const campo = formulario.querySelector(`[name="${nome}"]`);
  if (!campo) return;
  campo.value = valor === null || valor === undefined ? "" : valor;
  campo.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Formulário do sistema estelar.
 *
 * As estrelas não estão aqui: viraram corpos celestes, e são editadas na aba
 * Sistema junto com planetas e luas.
 */
export function formularioSistema(sistema = {}, { regioes = [], faccoes = [] } = {}) {
  const opcoesRegiao = [["", "— sem região —"], ...regioes.map((r) => [r.id, r.name])];
  const opcoesFaccao = [["", "— independente —"], ...faccoes.map((f) => [f.id, f.name])];

  // O preset dá vocação ao sorteio: um bastião militar não sai com a mesma
  // ficha de um entreposto comercial.
  const seletorDePreset = el("select", {
    classe: "sorteio__preset",
    name: "preset_de_geracao",
    "aria-label": "Vocação do sistema sorteado",
  });
  for (const [valor, texto] of opcoesDePreset("— vocação aleatória —")) {
    seletorDePreset.appendChild(el("option", { value: valor, texto }));
  }

  // Um sorteio pode cair num sistema desabitado, que não tem métrica nenhuma:
  // sem esta linha, a tela não muda e parece que o botão não funcionou.
  const resultadoDoSorteio = el("span", { classe: "campo__ajuda" });

  const elemento = el("form", { classe: "formulario", onSubmit: (e) => e.preventDefault() }, [
    campoTexto("Nome", "name", sistema.name || "", {
      acessorio: botaoSortear("Sortear um nome", async () => {
        try {
          const { name } = await api.proporNome();
          definir(elemento, "name", name);
        } catch (erro) {
          notificarErro(erro);
        }
      }),
    }),
    campoSelecao("Região", "region_id", opcoesRegiao, sistema.region_id),
    campoSelecao("Soberania", "sovereign_faction_id", opcoesFaccao, sistema.sovereign_faction_id),
    campoTexto("População", "population", sistema.population ?? 0, { tipo: "number", min: 0 }),
    campoArea("Descrição", "lore_text", sistema.lore_text || ""),
    campoArea("Aviso em destaque", "notice_text", sistema.notice_text || ""),
    el("div", { classe: "secao__titulo rotulo secao__titulo--acao" }, [
      el("span", { texto: "Métricas (0 a 100)" }),
      el("div", { classe: "sorteio" }, [
        seletorDePreset,
        botaoSortear("Sortear população e métricas coerentes entre si", async () => {
          try {
            const proposta = await api.proporSistema({ preset: seletorDePreset.value });
            definir(elemento, "population", proposta.population);
            for (const [chave] of METRICAS) definir(elemento, chave, proposta[chave]);
            resultadoDoSorteio.textContent = descreverSorteio(proposta);
          } catch (erro) {
            notificarErro(erro);
          }
        }),
      ]),
    ]),
    resultadoDoSorteio,
    ...METRICAS.map(([chave, rotulo]) => campoDeMetrica(chave, rotulo, sistema[chave])),
    campoBooleano("Sistema classificado", "is_classified", sistema.is_classified),
  ]);

  return {
    elemento,
    valores() {
      const dados = {
        name: texto(elemento, "name"),
        region_id: numeroOuNulo(elemento, "region_id"),
        sovereign_faction_id: numeroOuNulo(elemento, "sovereign_faction_id"),
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

/** Resumo do que o sorteio devolveu, inclusive quando o resultado é vazio. */
function descreverSorteio(proposta) {
  const partes = [proposta.preset_nome || "Vocação aleatória", proposta.perfil_nome];
  if (proposta.economy === null || proposta.economy === undefined) {
    partes.push("sem métricas — sistema desabitado");
  }
  return `Sorteado: ${partes.filter(Boolean).join(" · ")}`;
}

/** Campo de métrica que mostra, embaixo, o que o valor digitado significa. */
function campoDeMetrica(chave, rotulo, valor) {
  const legenda = el("span", { classe: "campo__ajuda" });
  const campo = campoTexto(rotulo, chave, valor ?? "", { tipo: "number", min: 0, max: 100 });
  campo.appendChild(legenda);

  const atualizar = (bruto) => {
    const faixa = faixaDaMetrica(chave, bruto === "" ? null : Number(bruto));
    legenda.textContent = faixa ? `${faixa.nome} — ${faixa.descricao}` : "Sem dado";
  };

  campo.querySelector("input").addEventListener("input", (evento) => atualizar(evento.target.value));
  atualizar(valor ?? "");
  return campo;
}

/** Formulário de corpo celeste (diálogo de criar/editar). */
export function formularioCorpo(corpo = {}, { corposDoSistema = [] } = {}) {
  const candidatos = corposDoSistema.filter(
    (item) => item.id !== corpo.id && item.body_type !== "moon"
  );
  const estrelas = candidatos.filter((item) => item.body_type === "star");

  // No centro do sistema só ficam estrelas. Enquanto não houver nenhuma, o
  // centro continua disponível — é onde o mestre começa um sistema do zero.
  const centroDisponivel = (tipo) => tipo === "star" || estrelas.length === 0;

  // Estrela nasce no centro; o resto nasce orbitando a estrela principal.
  const orbitaPadraoDe = (tipo) =>
    corpo.parent_body_id ?? (centroDisponivel(tipo) ? "" : String(estrelas[0].id));

  const opcoesDeOrbita = (tipo) => [
    ...(centroDisponivel(tipo) ? [["", CENTRO_DO_SISTEMA]] : []),
    ...candidatos.map((item) => [item.id, item.name]),
  ];

  const selecaoDeClasse = campoSelecao(
    "Classe espectral",
    "star_class",
    opcoesDeClasseDeEstrela("— não informada —"),
    corpo.star_class,
    { classe: "campo--estrela" }
  );

  const elemento = el("form", { classe: "formulario", onSubmit: (e) => e.preventDefault() }, [
    campoTexto("Nome", "name", corpo.name || ""),
    campoSelecao("Tipo", "body_type", opcoesDeTipoDeCorpo(), corpo.body_type || "planet"),
    selecaoDeClasse,
    campoSelecao(
      "Orbita",
      "parent_body_id",
      opcoesDeOrbita(corpo.body_type || "planet"),
      orbitaPadraoDe(corpo.body_type || "planet")
    ),
    el("div", { classe: "grade-dupla" }, [
      campoTexto("Ordem orbital", "orbital_order", corpo.orbital_order ?? 0, { tipo: "number" }),
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

  // Classe espectral só faz sentido para estrelas; e trocar o tipo pode tirar
  // (ou devolver) o centro do sistema da lista de órbitas possíveis.
  const seletorDeTipo = elemento.querySelector('[name="body_type"]');
  const seletorDeOrbita = elemento.querySelector('[name="parent_body_id"]');

  // Enquanto o usuário não escolhe a órbita à mão, ela acompanha o tipo.
  let orbitaEscolhidaAMao = false;
  seletorDeOrbita.addEventListener("change", () => {
    orbitaEscolhidaAMao = true;
  });

  const sincronizarTipo = () => {
    const tipo = seletorDeTipo.value;
    selecaoDeClasse.hidden = tipo !== "star";

    const desejado = orbitaEscolhidaAMao ? seletorDeOrbita.value : orbitaPadraoDe(tipo);
    const opcoes = opcoesDeOrbita(tipo);
    limpar(seletorDeOrbita);
    for (const [valor, texto] of opcoes) {
      seletorDeOrbita.appendChild(el("option", { value: valor, texto }));
    }
    const aindaVale = opcoes.some(([valor]) => String(valor) === String(desejado));
    seletorDeOrbita.value = aindaVale ? String(desejado) : String(opcoes[0][0]);
  };

  seletorDeTipo.addEventListener("change", sincronizarTipo);
  sincronizarTipo();

  return {
    elemento,
    valores() {
      const ehEstrela = texto(elemento, "body_type") === "star";
      return {
        name: texto(elemento, "name"),
        body_type: texto(elemento, "body_type"),
        star_class: ehEstrela ? texto(elemento, "star_class") : "",
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
      campoSelecao("Tendência", "trend", opcoesDeTendencia(), influencia.trend || "steady"),
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

/**
 * Formulário de rota, mostrado ao ligar dois sistemas no mapa.
 *
 * Não há mais escolha de mão dupla: uma rota liga os dois sistemas nos dois
 * sentidos, sempre. A descrição aparece ao selecionar a rota no mapa.
 */
export function formularioRota(rota = {}) {
  const elemento = el("form", { classe: "formulario", onSubmit: (e) => e.preventDefault() }, [
    campoSelecao("Tipo da rota", "lane_type", opcoesDeTipoDeRota(), rota.lane_type || "hyperlane"),
    campoArea("Descrição", "notes", rota.notes || ""),
  ]);

  return {
    elemento,
    valores: () => ({
      lane_type: texto(elemento, "lane_type"),
      notes: texto(elemento, "notes"),
    }),
  };
}

/** Formulário de região, usado na tela de administração. */
export function formularioRegiao(regiao = {}, { regioes = [], niveis = [] } = {}) {
  const opcoesPai = [
    ["", "— sem região superior —"],
    ...regioes.filter((item) => item.id !== regiao.id).map((item) => [item.id, item.name]),
  ];

  const elemento = el("form", { classe: "formulario", onSubmit: (e) => e.preventDefault() }, [
    campoTexto("Nome", "name", regiao.name || ""),
    campoSelecao("Nível", "level", niveis, regiao.level || "cluster"),
    campoSelecao("Região superior", "parent_id", opcoesPai, regiao.parent_id),
    campoArea("Descrição", "description", regiao.description || ""),
    campoTexto("Ordem", "sort_order", regiao.sort_order ?? 0, { tipo: "number" }),
  ]);

  return {
    elemento,
    valores: () => ({
      name: texto(elemento, "name"),
      level: texto(elemento, "level"),
      parent_id: numeroOuNulo(elemento, "parent_id"),
      description: texto(elemento, "description"),
      sort_order: Number(texto(elemento, "sort_order") || 0),
    }),
  };
}

/** Formulário de facção, usado na tela de administração. */
export function formularioFaccao(faccao = {}) {
  const seletorDeCor = el("input", {
    type: "color",
    name: "color_hex",
    value: faccao.color_hex || "#8899aa",
  });

  const elemento = el("form", { classe: "formulario", onSubmit: (e) => e.preventDefault() }, [
    campoTexto("Nome", "name", faccao.name || ""),
    campoTexto("Sigla", "short_name", faccao.short_name || ""),
    el("label", { classe: "campo" }, [el("span", { texto: "Cor" }), seletorDeCor]),
    campoArea("Descrição", "description", faccao.description || ""),
    campoTexto("Ordem", "sort_order", faccao.sort_order ?? 0, { tipo: "number" }),
  ]);

  return {
    elemento,
    valores: () => ({
      name: texto(elemento, "name"),
      short_name: texto(elemento, "short_name"),
      color_hex: seletorDeCor.value,
      description: texto(elemento, "description"),
      sort_order: Number(texto(elemento, "sort_order") || 0),
    }),
  };
}
