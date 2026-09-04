/**
 * Painel lateral do sistema estelar.
 *
 * O mesmo componente serve leitura e edição: as abas Visão Geral / Sistema /
 * Geopolítica são montadas a partir do mesmo detalhe vindo da API, e o modo
 * editor apenas revela formulários e ações no lugar do conteúdo estático.
 */

import { abrirDialogo, confirmar } from "../shared/dialogo.js";
import { el, limpar, numero, populacao, svg } from "../shared/dom.js";
import { notificarErro, notificarSucesso } from "../shared/notificacoes.js";
import {
  METRICAS,
  TIPOS_DE_CORPO,
  formularioCorpo,
  formularioInfluencias,
  formularioSistema,
} from "./formularios.js";

const ABAS = [
  ["visao", "Visão Geral"],
  ["sistema", "Sistema"],
  ["geopolitica", "Geopolítica"],
];

const NOME_TIPO_CORPO = Object.fromEntries(TIPOS_DE_CORPO);

export function criarPainelSistema({ raiz, api, aoMudarDados, contexto }) {
  let sistema = null;
  let abaAtiva = "visao";
  let editando = false;
  let modoEditor = false;
  let formularioAtual = null;

  const noTopo = el("div", { classe: "painel-sistema__topo" });
  const noAbas = el("div", { classe: "abas", role: "tablist" });
  const noConteudo = el("div", { classe: "painel-sistema__conteudo" });
  const noRodape = el("div", { classe: "painel-sistema__rodape", hidden: "" });

  raiz.append(noTopo, noAbas, noConteudo, noRodape);
  raiz.hidden = true;

  // --- Ciclo de vida -------------------------------------------------------

  async function mostrar(sistemaId) {
    try {
      sistema = await api.obterSistema(sistemaId);
      editando = false;
      raiz.hidden = false;
      desenhar();
    } catch (erro) {
      notificarErro(erro);
    }
  }

  async function recarregar() {
    if (!sistema) return;
    sistema = await api.obterSistema(sistema.id);
    desenhar();
    if (aoMudarDados) aoMudarDados();
  }

  function fechar() {
    sistema = null;
    editando = false;
    raiz.hidden = true;
  }

  function definirModoEditor(ativo) {
    modoEditor = ativo;
    if (!ativo) editando = false;
    if (sistema) desenhar();
  }

  // --- Montagem ------------------------------------------------------------

  function desenhar() {
    desenharTopo();
    desenharAbas();
    desenharConteudo();
    desenharRodape();
  }

  function desenharTopo() {
    const caminho = (sistema.region_path || []).map((passo) => passo.name).join(" // ");
    limpar(noTopo).append(
      el("button", {
        classe: "painel-sistema__fechar",
        texto: "×",
        type: "button",
        "aria-label": "Fechar painel",
        onClick: fechar,
      }),
      el("span", { classe: "rotulo", texto: "Registro do Braço de Órion" }),
      el("h1", { classe: "painel-sistema__nome", texto: sistema.name }),
      el("span", {
        classe: "rotulo painel-sistema__caminho",
        texto: caminho || "Sem região definida",
      }),
      sistema.lore_text
        ? el("p", { classe: "painel-sistema__lore", texto: sistema.lore_text })
        : null,
      blocoSoberania()
    );
  }

  function blocoSoberania() {
    const faccao = sistema.sovereign_faction;
    return el("div", { classe: "painel-sistema__soberania" }, [
      el("div", {
        classe: "painel-sistema__bandeira",
        style: `background:${faccao ? faccao.color_hex : "transparent"}`,
      }),
      el("div", {}, [
        el("span", { classe: "rotulo", texto: "Soberania" }),
        el("div", {
          classe: "corpo__nome",
          texto: faccao ? faccao.name : "Independente",
        }),
      ]),
    ]);
  }

  function desenharAbas() {
    limpar(noAbas);
    for (const [id, rotulo] of ABAS) {
      noAbas.appendChild(
        el("button", {
          classe: "aba",
          texto: rotulo,
          type: "button",
          role: "tab",
          "aria-selected": String(abaAtiva === id),
          dataset: { aba: id },
          onClick: () => {
            abaAtiva = id;
            editando = false;
            desenhar();
          },
        })
      );
    }
  }

  function desenharConteudo() {
    limpar(noConteudo);
    if (editando) {
      noConteudo.appendChild(conteudoEdicao());
      return;
    }
    if (abaAtiva === "visao") noConteudo.appendChild(abaVisaoGeral());
    else if (abaAtiva === "sistema") noConteudo.appendChild(abaSistema());
    else noConteudo.appendChild(abaGeopolitica());
  }

  function desenharRodape() {
    limpar(noRodape);
    noRodape.hidden = !modoEditor || editando;
    if (noRodape.hidden) return;

    noRodape.append(
      el("button", {
        classe: "botao botao--primario",
        texto: "Editar sistema",
        type: "button",
        onClick: () => {
          editando = true;
          desenhar();
        },
      }),
      el("button", {
        classe: "botao botao--perigo",
        texto: "Excluir",
        type: "button",
        onClick: excluirSistema,
      })
    );
  }

  // --- Aba: Visão Geral ----------------------------------------------------

  function abaVisaoGeral() {
    const contagens = sistema.counts;
    return el("div", {}, [
      sistema.notice_text ? el("div", { classe: "aviso", texto: sistema.notice_text }) : null,
      el("h2", {
        classe: "corpo__nome",
        texto: descricaoDoSistema(),
      }),
      grade([
        [numero(contagens.bodies), "Corpos"],
        [numero(contagens.colonized), "Colonizados"],
        [numero(contagens.lanes), "Rotas"],
        [populacao(sistema.population), "População"],
      ]),
      el("div", { classe: "secao__titulo rotulo", texto: "Mapa do sistema" }),
      diagramaOrbital(sistema.bodies),
    ]);
  }

  function descricaoDoSistema() {
    const nomes = { 1: "Sistema estelar único", 2: "Sistema binário", 3: "Sistema trinário" };
    const base = nomes[sistema.star_count] || `Sistema com ${sistema.star_count} estrelas`;
    return sistema.star_type ? `${sistema.star_type} — ${base}` : base;
  }

  function diagramaOrbital(corpos) {
    if (!corpos.length) {
      return el("div", { classe: "vazio", texto: "Nenhum corpo celeste registrado" });
    }
    const largura = 340;
    const altura = 90;
    const passo = Math.min(46, (largura - 60) / Math.max(corpos.length, 1));
    const meio = altura / 2 + 8;

    const nos = [
      svg("line", { classe: "orbital__linha", x1: 16, y1: meio, x2: largura - 10, y2: meio }),
      svg("circle", { classe: "orbital__estrela", cx: 16, cy: meio, r: 9 }),
    ];

    corpos.forEach((corpo, indice) => {
      const cx = 46 + indice * passo;
      nos.push(
        svg("circle", {
          classe: `orbital__corpo${corpo.is_colonized ? " orbital__corpo--colonizado" : ""}`,
          cx,
          cy: meio,
          r: corpo.body_type === "belt" ? 3 : 6,
        })
      );
      svgTitulo(nos[nos.length - 1], corpo.name);
      (corpo.children || []).forEach((lua, ordem) => {
        nos.push(
          svg("circle", {
            classe: "orbital__corpo",
            cx,
            cy: meio - 16 - ordem * 7,
            r: 2,
          })
        );
      });
    });

    return svg("svg", { classe: "orbital", viewBox: `0 0 ${largura} ${altura}` }, nos);
  }

  function svgTitulo(no, texto) {
    no.appendChild(svg("title", { texto }));
  }

  // --- Aba: Sistema --------------------------------------------------------

  function abaSistema() {
    const contagens = sistema.counts;
    return el("div", {}, [
      el("h2", { classe: "corpo__nome", texto: descricaoDoSistema() }),
      grade([
        [numero(contagens.planets), "Planetas"],
        [numero(contagens.satellites), "Satélites"],
        [numero(contagens.stations), "Estações"],
        [numero(contagens.lanes), "Rotas"],
      ]),
      el("div", { classe: "secao__titulo rotulo", texto: "Corpos celestes" }),
      modoEditor
        ? el("button", {
            classe: "botao",
            texto: "+ Novo corpo celeste",
            type: "button",
            onClick: () => abrirFormularioCorpo(),
          })
        : null,
      listaDeCorpos(sistema.bodies),
    ]);
  }

  function listaDeCorpos(corpos, nivel = 0) {
    if (!corpos.length && nivel === 0) {
      return el("div", { classe: "vazio", texto: "Nenhum corpo celeste registrado" });
    }
    const container = el("div", {});
    for (const corpo of corpos) {
      container.appendChild(linhaDeCorpo(corpo, nivel));
      if (corpo.children && corpo.children.length) {
        container.appendChild(listaDeCorpos(corpo.children, nivel + 1));
      }
    }
    return container;
  }

  function linhaDeCorpo(corpo, nivel) {
    const tags = corpo.tags && corpo.tags.length ? corpo.tags.join(", ") : null;
    return el(
      "div",
      {
        classe: `corpo${nivel ? " corpo--lua" : ""}${
          corpo.is_colonized ? " corpo--colonizado" : ""
        }`,
      },
      [
        el("div", { classe: "corpo__marcador" }),
        el("div", {}, [
          el("div", { classe: "corpo__nome", texto: corpo.name }),
          el("div", {
            classe: "corpo__tags",
            texto: tags || NOME_TIPO_CORPO[corpo.body_type] || corpo.body_type,
          }),
        ]),
        modoEditor
          ? el("div", { classe: "corpo__acoes" }, [
              el("button", {
                classe: "botao",
                texto: "Editar",
                type: "button",
                onClick: () => abrirFormularioCorpo(corpo),
              }),
              el("button", {
                classe: "botao botao--perigo",
                texto: "×",
                type: "button",
                "aria-label": `Excluir ${corpo.name}`,
                onClick: () => excluirCorpo(corpo),
              }),
            ])
          : null,
      ]
    );
  }

  // --- Aba: Geopolítica ----------------------------------------------------

  function abaGeopolitica() {
    if (sistema.is_classified && !modoEditor) {
      return el("div", { classe: "acesso-restrito", texto: "Acesso restrito" });
    }

    const influencias = sistema.influences || [];
    const total = influencias.reduce((soma, item) => soma + item.influence_value, 0);

    return el("div", {}, [
      el("div", { classe: "secao__titulo rotulo", texto: "População" }),
      medidor("Habitantes estimados", populacao(sistema.population), escalaPopulacao()),
      el("div", { classe: "secao__titulo rotulo", texto: "Equilíbrio de poder" }),
      total
        ? el(
            "div",
            { classe: "equilibrio" },
            influencias.map((item) =>
              el("div", {
                classe: "equilibrio__fatia",
                style: `width:${(item.influence_value / total) * 100}%;background:${
                  item.color_hex || "#8899aa"
                }`,
                title: `${item.faction_name}: ${item.influence_value}`,
              })
            )
          )
        : el("div", { classe: "vazio", texto: "Sem influência registrada" }),
      ...influencias.map((item) =>
        medidor(
          item.faction_name,
          item.qualitative_label || rotuloDeTendencia(item.trend),
          item.influence_value,
          item.color_hex
        )
      ),
      el("div", { classe: "secao__titulo rotulo", texto: "Métricas" }),
      grade(
        METRICAS.map(([chave, rotulo]) => [
          sistema[chave] === null || sistema[chave] === undefined ? "—" : sistema[chave],
          rotulo,
        ])
      ),
      modoEditor
        ? el("button", {
            classe: "botao",
            texto: "Editar influências",
            type: "button",
            onClick: abrirFormularioInfluencias,
          })
        : null,
    ]);
  }

  function escalaPopulacao() {
    const total = Number(sistema.population || 0);
    if (!total) return 0;
    return Math.min(100, (Math.log10(total) / 12) * 100);
  }

  function rotuloDeTendencia(tendencia) {
    return { rising: "Em alta", falling: "Em queda", steady: "Estável" }[tendencia] || "";
  }

  function medidor(titulo, valorTexto, porcentagem, cor) {
    return el("div", { classe: "medidor" }, [
      el("div", { classe: "medidor__topo" }, [
        el("span", { classe: "rotulo", texto: titulo }),
        el("span", { classe: "rotulo", texto: String(valorTexto) }),
      ]),
      el("div", { classe: "medidor__barra" }, [
        el("div", {
          classe: "medidor__preenchimento",
          style: `width:${Math.max(0, Math.min(100, porcentagem))}%${
            cor ? `;background:${cor}` : ""
          }`,
        }),
      ]),
    ]);
  }

  function grade(itens) {
    return el(
      "div",
      { classe: "estatisticas" },
      itens.map(([valor, rotulo]) =>
        el("div", { classe: "estatistica" }, [
          el("div", { classe: "estatistica__valor", texto: String(valor) }),
          el("div", { classe: "estatistica__rotulo rotulo", texto: rotulo }),
        ])
      )
    );
  }

  // --- Edição do sistema ---------------------------------------------------

  function conteudoEdicao() {
    formularioAtual = formularioSistema(sistema, {
      regioes: contexto.regioes(),
      faccoes: contexto.faccoes(),
    });

    return el("div", {}, [
      formularioAtual.elemento,
      el("div", { classe: "dialogo__acoes" }, [
        el("button", {
          classe: "botao",
          texto: "Cancelar",
          type: "button",
          onClick: () => {
            editando = false;
            desenhar();
          },
        }),
        el("button", {
          classe: "botao botao--primario",
          texto: "Salvar",
          type: "button",
          onClick: salvarSistema,
        }),
      ]),
    ]);
  }

  async function salvarSistema() {
    try {
      await api.atualizarSistema(sistema.id, formularioAtual.valores());
      editando = false;
      await recarregar();
      notificarSucesso("Sistema atualizado.");
    } catch (erro) {
      notificarErro(erro);
    }
  }

  async function excluirSistema() {
    try {
      const impacto = await api.impactoSistema(sistema.id);
      const confirmado = await confirmar({
        titulo: "Excluir sistema",
        mensagem: `Excluir o sistema ${sistema.name}?`,
        impacto: `Também serão removidos: ${impacto.bodies} corpo(s) celeste(s), ${impacto.lanes} rota(s) e ${impacto.influences} registro(s) de influência.`,
      });
      if (!confirmado) return;

      await api.excluirSistema(sistema.id);
      fechar();
      notificarSucesso("Sistema excluído.");
      if (aoMudarDados) aoMudarDados();
    } catch (erro) {
      notificarErro(erro);
    }
  }

  // --- Edição de corpos celestes -------------------------------------------

  function achatar(corpos, acumulado = []) {
    for (const corpo of corpos) {
      acumulado.push(corpo);
      if (corpo.children) achatar(corpo.children, acumulado);
    }
    return acumulado;
  }

  async function abrirFormularioCorpo(corpo = null) {
    const formulario = formularioCorpo(corpo || {}, {
      corposDoSistema: achatar(sistema.bodies),
    });

    const salvou = await abrirDialogo({
      titulo: corpo ? `Editar ${corpo.name}` : "Novo corpo celeste",
      conteudo: formulario.elemento,
      acoes: [
        { texto: "Cancelar", id: "cancelar", valor: null },
        {
          texto: "Salvar",
          id: "salvar",
          classe: "botao--primario",
          aoClicar: async () => {
            try {
              const valores = formulario.valores();
              if (corpo) await api.atualizarCorpo(sistema.id, corpo.id, valores);
              else await api.criarCorpo(sistema.id, valores);
              return true;
            } catch (erro) {
              notificarErro(erro);
              return false;
            }
          },
        },
      ],
    });

    if (salvou) {
      await recarregar();
      notificarSucesso(corpo ? "Corpo celeste atualizado." : "Corpo celeste criado.");
    }
  }

  async function excluirCorpo(corpo) {
    const quantidadeLuas = (corpo.children || []).length;
    const confirmado = await confirmar({
      titulo: "Excluir corpo celeste",
      mensagem: `Excluir ${corpo.name}?`,
      impacto: quantidadeLuas
        ? `Também serão removidos ${quantidadeLuas} corpo(s) em órbita.`
        : null,
    });
    if (!confirmado) return;

    try {
      await api.excluirCorpo(sistema.id, corpo.id);
      await recarregar();
      notificarSucesso("Corpo celeste excluído.");
    } catch (erro) {
      notificarErro(erro);
    }
  }

  // --- Edição de influências -----------------------------------------------

  async function abrirFormularioInfluencias() {
    const formulario = formularioInfluencias(sistema.influences || [], contexto.faccoes());

    const salvou = await abrirDialogo({
      titulo: "Influência das facções",
      conteudo: formulario.elemento,
      acoes: [
        { texto: "Cancelar", id: "cancelar", valor: null },
        {
          texto: "Salvar",
          id: "salvar",
          classe: "botao--primario",
          aoClicar: async () => {
            try {
              await api.definirInfluencias(sistema.id, formulario.valores());
              return true;
            } catch (erro) {
              notificarErro(erro);
              return false;
            }
          },
        },
      ],
    });

    if (salvou) {
      await recarregar();
      notificarSucesso("Influências atualizadas.");
    }
  }

  return {
    mostrar,
    fechar,
    recarregar,
    definirModoEditor,
    get sistemaAtual() {
      return sistema;
    },
  };
}
