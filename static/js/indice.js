/** Tela do Índice de Sistemas: tabela filtrável, ordenável e agrupável. */

import {
  COLUNAS,
  agruparPorRegiao,
  filtrar,
  ordenar,
  proximaOrdenacao,
} from "./modules/index/tabela.js";
import { api } from "./modules/shared/api.js";
import { el, limpar, numero, populacao } from "./modules/shared/dom.js";
import { notificarErro } from "./modules/shared/notificacoes.js";

const estado = {
  sistemas: [],
  faccoes: [],
  busca: "",
  faccoesFiltradas: new Set(),
  ordenacao: { campo: "name", direcao: "asc" },
  agrupar: true,
  gruposFechados: new Set(),
};

const cabecalho = document.getElementById("cabecalho-indice");
const corpo = document.getElementById("corpo-indice");
const vazio = document.getElementById("indice-vazio");

async function carregar() {
  try {
    const dados = await api.indice();
    estado.sistemas = dados.systems;
    estado.faccoes = listarFaccoes(dados.systems);
    desenharFiltrosDeFaccao();
    desenharCabecalho();
    desenhar();
  } catch (erro) {
    notificarErro(erro);
  }
}

function listarFaccoes(sistemas) {
  const mapa = new Map();
  for (const sistema of sistemas) {
    if (sistema.faction_id && !mapa.has(sistema.faction_id)) {
      mapa.set(sistema.faction_id, {
        id: sistema.faction_id,
        nome: sistema.faction_name,
        cor: sistema.faction_color,
      });
    }
  }
  const faccoes = [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (sistemas.some((sistema) => !sistema.faction_id)) {
    faccoes.push({ id: 0, nome: "Independentes", cor: "#7d9382" });
  }
  return faccoes;
}

function desenharFiltrosDeFaccao() {
  const container = document.getElementById("filtros-faccao");
  limpar(container);

  for (const faccao of estado.faccoes) {
    const chip = el(
      "button",
      {
        classe: "chip-faccao",
        type: "button",
        "aria-pressed": String(estado.faccoesFiltradas.has(faccao.id)),
        dataset: { faccao: faccao.id },
        onClick: () => {
          if (estado.faccoesFiltradas.has(faccao.id)) estado.faccoesFiltradas.delete(faccao.id);
          else estado.faccoesFiltradas.add(faccao.id);
          desenharFiltrosDeFaccao();
          desenhar();
        },
      },
      [
        el("span", { classe: "chip-faccao__cor", style: `background:${faccao.cor}` }),
        el("span", { texto: faccao.nome }),
      ]
    );
    container.appendChild(chip);
  }
}

function desenharCabecalho() {
  limpar(cabecalho);
  const linha = el("tr");

  linha.appendChild(el("th", { texto: "#", classe: "coluna-texto" }));
  for (const coluna of COLUNAS) {
    const ordenadaPor = estado.ordenacao.campo === coluna.chave;
    linha.appendChild(
      el("th", {
        texto: coluna.rotulo,
        classe: coluna.texto ? "coluna-texto" : "",
        "aria-sort": ordenadaPor
          ? estado.ordenacao.direcao === "asc"
            ? "ascending"
            : "descending"
          : "none",
        dataset: { coluna: coluna.chave },
        onClick: () => {
          estado.ordenacao = proximaOrdenacao(estado.ordenacao, coluna.chave);
          desenharCabecalho();
          desenhar();
        },
      })
    );
  }
  cabecalho.appendChild(linha);
}

function sistemasVisiveis() {
  const filtrados = filtrar(estado.sistemas, {
    busca: estado.busca,
    faccoes: [...estado.faccoesFiltradas],
  });
  return ordenar(filtrados, estado.ordenacao.campo, estado.ordenacao.direcao);
}

function desenhar() {
  const sistemas = sistemasVisiveis();
  limpar(corpo);
  vazio.hidden = sistemas.length > 0;

  document.getElementById("indice-resumo").textContent =
    `${sistemas.length} de ${estado.sistemas.length} sistemas`;

  if (!estado.agrupar) {
    sistemas.forEach((sistema, indice) => corpo.appendChild(linhaDeSistema(sistema, indice + 1)));
    return;
  }

  let posicao = 0;
  for (const grupo of agruparPorRegiao(sistemas)) {
    const fechado = estado.gruposFechados.has(grupo.nome);
    corpo.appendChild(linhaDeGrupo(grupo, fechado));
    if (fechado) continue;
    for (const sistema of grupo.sistemas) {
      posicao += 1;
      corpo.appendChild(linhaDeSistema(sistema, posicao));
    }
  }
}

function linhaDeGrupo(grupo, fechado) {
  return el(
    "tr",
    {
      classe: "linha-grupo",
      onClick: () => {
        if (fechado) estado.gruposFechados.delete(grupo.nome);
        else estado.gruposFechados.add(grupo.nome);
        desenhar();
      },
    },
    [
      el("td", { colspan: String(COLUNAS.length + 1) }, [
        el("span", { classe: "linha-grupo__seta", texto: fechado ? "▸" : "▾" }),
        el("span", { texto: `${grupo.nome} — ${grupo.sistemas.length}` }),
      ]),
    ]
  );
}

function linhaDeSistema(sistema, posicao) {
  const celulas = [
    el("td", { classe: "coluna-texto", texto: String(posicao).padStart(2, "0") }),
    el("td", { classe: "coluna-texto" }, [
      el("span", { classe: "celula-sistema", texto: sistema.name }),
      sistema.is_classified
        ? el("span", { classe: "marca-classificado", texto: " · classificado" })
        : null,
    ]),
    el("td", { classe: "coluna-texto", texto: sistema.region_name || "—" }),
    el("td", { classe: "coluna-texto" }, [
      sistema.faction_name
        ? el("span", { classe: "celula-soberania" }, [
            el("span", {
              classe: "celula-soberania__cor",
              style: `background:${sistema.faction_color}`,
            }),
            el("span", { texto: sistema.faction_name }),
          ])
        : el("span", { texto: "Independente" }),
    ]),
    el("td", { texto: populacao(sistema.population) }),
    el("td", { texto: numero(sistema.star_count) }),
    el("td", { texto: numero(sistema.planets) }),
    el("td", { texto: numero(sistema.satellites) }),
    el("td", { texto: numero(sistema.lanes) }),
    ...["economy", "industry", "innovation", "information", "stability", "quality_of_life"].map(
      (chave) => el("td", { texto: numero(sistema[chave]) })
    ),
  ];

  return el(
    "tr",
    {
      classe: "linha-sistema",
      dataset: { sistema: sistema.id },
      onClick: () => {
        window.location.href = `/?sistema=${sistema.id}`;
      },
    },
    celulas
  );
}

function ligarInterface() {
  document.getElementById("campo-filtro").addEventListener("input", (evento) => {
    estado.busca = evento.target.value;
    desenhar();
  });

  const botaoAgrupar = document.getElementById("botao-agrupar");
  botaoAgrupar.addEventListener("click", () => {
    estado.agrupar = !estado.agrupar;
    botaoAgrupar.setAttribute("aria-pressed", String(estado.agrupar));
    desenhar();
  });

  document.getElementById("botao-limpar").addEventListener("click", () => {
    estado.busca = "";
    estado.faccoesFiltradas.clear();
    estado.gruposFechados.clear();
    document.getElementById("campo-filtro").value = "";
    desenharFiltrosDeFaccao();
    desenhar();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !evento.target.matches("input")) {
      window.location.href = "/";
    }
  });
}

ligarInterface();
carregar();
