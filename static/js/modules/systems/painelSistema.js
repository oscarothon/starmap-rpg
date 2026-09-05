/**
 * Painel lateral do sistema estelar.
 *
 * O mesmo componente serve leitura e edição: as abas Visão Geral / Sistema /
 * Geopolítica são montadas a partir do detalhe vindo da API, e o modo editor
 * revela formulários e ações no lugar do conteúdo estático.
 *
 * Clicar num corpo celeste — na lista ou no diagrama — abre a ficha dele, que é
 * onde os pontos de interesse vão entrar mais adiante.
 */

import { abrirDialogo, confirmar } from "../shared/dialogo.js";
import { faixaDePopulacao, nomeDaClasse, nomeDoTipoDeCorpo } from "../shared/catalogo.js";
import { el, limpar, numero, populacao } from "../shared/dom.js";
import { notificarErro, notificarSucesso } from "../shared/notificacoes.js";
import { CENTRO_DO_SISTEMA, METRICAS, formularioCorpo, formularioInfluencias, formularioSistema } from "./formularios.js";
import { desenharMapaDoSistema } from "./mapaDoSistema.js";

const ABAS = [
  ["visao", "Visão Geral"],
  ["sistema", "Sistema"],
  ["geopolitica", "Geopolítica"],
];

export function criarPainelSistema({ raiz, api, aoMudarDados, contexto }) {
  let sistema = null;
  let abaAtiva = "visao";
  let editando = false;
  let modoEditor = false;
  let corpoAberto = null;
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
      corpoAberto = null;
      raiz.hidden = false;
      desenhar();
    } catch (erro) {
      notificarErro(erro);
    }
  }

  async function recarregar() {
    if (!sistema) return;
    sistema = await api.obterSistema(sistema.id);
    if (corpoAberto) corpoAberto = acharCorpo(sistema.bodies, corpoAberto.id);
    desenhar();
    if (aoMudarDados) aoMudarDados();
  }

  function fechar() {
    sistema = null;
    editando = false;
    corpoAberto = null;
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
            corpoAberto = null;
            desenhar();
          },
        })
      );
    }
  }

  function desenharConteudo() {
    limpar(noConteudo);
    if (corpoAberto) {
      noConteudo.appendChild(fichaDoCorpo(corpoAberto));
      return;
    }
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
    noRodape.hidden = !modoEditor || editando || Boolean(corpoAberto);
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
      el("h2", { classe: "corpo__nome", texto: sistema.star_summary }),
      grade([
        [numero(contagens.bodies), "Corpos"],
        [numero(contagens.stars), "Estrelas"],
        [numero(contagens.colonized), "Colonizados"],
        [numero(contagens.lanes), "Rotas"],
      ]),
      el("div", { classe: "secao__titulo rotulo", texto: "Mapa do sistema" }),
      mapaDoSistema(),
    ]);
  }

  function mapaDoSistema() {
    if (!sistema.bodies.length) {
      return el("div", { classe: "vazio", texto: "Nenhum corpo celeste registrado" });
    }
    return desenharMapaDoSistema(sistema, { aoEscolherCorpo: abrirCorpo });
  }

  // --- Aba: Sistema --------------------------------------------------------

  function abaSistema() {
    const contagens = sistema.counts;
    return el("div", {}, [
      el("h2", { classe: "corpo__nome", texto: sistema.star_summary }),
      grade([
        [numero(contagens.planets), "Planetas"],
        [numero(contagens.satellites), "Satélites"],
        [numero(contagens.stations), "Estações"],
        [numero(contagens.belts), "Cinturões"],
      ]),
      modoEditor
        ? el("div", { classe: "acoes-em-linha" }, [
            el("button", {
              classe: "botao",
              texto: "+ Novo corpo celeste",
              type: "button",
              onClick: () => abrirFormularioCorpo(),
            }),
            el("button", {
              classe: "botao",
              texto: "Gerar corpos",
              type: "button",
              title: "Cria estrelas e corpos plausíveis para este sistema",
              onClick: gerarCorpos,
            }),
          ])
        : null,
      el("div", { classe: "secao__titulo rotulo", texto: "Corpos celestes" }),
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
    const legenda =
      corpo.body_type === "star" ? nomeDaClasse(corpo.star_class) : nomeDoTipoDeCorpo(corpo.body_type);

    return el(
      "div",
      {
        classe: `corpo corpo--clicavel${nivel ? " corpo--lua" : ""}${
          corpo.is_colonized ? " corpo--colonizado" : ""
        }${corpo.body_type === "star" ? " corpo--estrela" : ""}`,
        role: "button",
        tabindex: "0",
        onClick: (evento) => {
          if (evento.target.closest(".corpo__acoes")) return;
          abrirCorpo(corpo);
        },
        onKeydown: (evento) => {
          if (evento.key === "Enter") abrirCorpo(corpo);
        },
      },
      [
        el("div", { classe: "corpo__marcador" }),
        el("div", { classe: "corpo__texto" }, [
          el("div", { classe: "corpo__nome", texto: corpo.name }),
          el("div", { classe: "corpo__tags", texto: tags || legenda }),
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

  // --- Ficha do corpo celeste ----------------------------------------------

  function acharCorpo(corpos, id) {
    for (const corpo of corpos) {
      if (corpo.id === id) return corpo;
      const encontrado = acharCorpo(corpo.children || [], id);
      if (encontrado) return encontrado;
    }
    return null;
  }

  function abrirCorpo(corpo) {
    corpoAberto = acharCorpo(sistema.bodies, corpo.id) || corpo;
    desenhar();
  }

  function nomeDaOrbita(corpo) {
    if (!corpo.parent_body_id) return CENTRO_DO_SISTEMA.replace(/—/g, "").trim();
    const pai = acharCorpo(sistema.bodies, corpo.parent_body_id);
    return pai ? pai.name : "corpo desconhecido";
  }

  function fichaDoCorpo(corpo) {
    const ehEstrela = corpo.body_type === "star";
    const classe = ehEstrela ? nomeDaClasse(corpo.star_class) : null;

    return el("div", { classe: "ficha-corpo" }, [
      el("button", {
        classe: "botao botao--voltar",
        type: "button",
        texto: "← Voltar ao sistema",
        onClick: () => {
          corpoAberto = null;
          desenhar();
        },
      }),
      el("h2", { classe: "ficha-corpo__nome", texto: corpo.name }),
      el("span", {
        classe: "rotulo",
        texto: ehEstrela ? classe : nomeDoTipoDeCorpo(corpo.body_type),
      }),
      corpo.tags && corpo.tags.length
        ? el(
            "div",
            { classe: "ficha-corpo__tags" },
            corpo.tags.map((tag) => el("span", { classe: "etiqueta", texto: tag }))
          )
        : null,
      grade([
        [nomeDaOrbita(corpo), "Orbita"],
        [corpo.orbital_radius_au ? `${corpo.orbital_radius_au} UA` : "—", "Raio orbital"],
        [numero(corpo.orbital_order), "Ordem"],
        [corpo.is_colonized ? "Sim" : "Não", "Colonizado"],
      ]),
      corpo.description
        ? el("p", { classe: "painel-sistema__lore", texto: corpo.description })
        : null,
      corpo.colony_notes
        ? el("div", {}, [
            el("div", { classe: "secao__titulo rotulo", texto: "Notas da colônia" }),
            el("p", { classe: "painel-sistema__lore", texto: corpo.colony_notes }),
          ])
        : null,
      corpo.children && corpo.children.length
        ? el("div", {}, [
            el("div", { classe: "secao__titulo rotulo", texto: "Em órbita deste corpo" }),
            listaDeCorpos(corpo.children),
          ])
        : null,
      modoEditor
        ? el("div", { classe: "dialogo__acoes" }, [
            el("button", {
              classe: "botao",
              texto: "Editar corpo",
              type: "button",
              onClick: () => abrirFormularioCorpo(corpo),
            }),
            el("button", {
              classe: "botao botao--perigo",
              texto: "Excluir",
              type: "button",
              onClick: () => excluirCorpo(corpo),
            }),
          ])
        : null,
    ]);
  }

  // --- Aba: Geopolítica ----------------------------------------------------

  function abaGeopolitica() {
    if (sistema.is_classified && !modoEditor) {
      return el("div", { classe: "acesso-restrito", texto: "Acesso restrito" });
    }

    const influencias = sistema.influences || [];
    const total = influencias.reduce((soma, item) => soma + item.influence_value, 0);
    const faixa = faixaDePopulacao(sistema.population);

    return el("div", {}, [
      el("div", { classe: "secao__titulo rotulo", texto: "População" }),
      el("div", { classe: "populacao" }, [
        el("span", { classe: "populacao__valor", texto: populacao(sistema.population) }),
        el("span", {
          classe: "rotulo",
          texto: faixa ? faixa.nome : "Sem dado",
        }),
      ]),
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
    const quantidadeFilhos = (corpo.children || []).length;
    const confirmado = await confirmar({
      titulo: "Excluir corpo celeste",
      mensagem: `Excluir ${corpo.name}?`,
      impacto: quantidadeFilhos
        ? `Também serão removidos ${quantidadeFilhos} corpo(s) em órbita.`
        : null,
    });
    if (!confirmado) return;

    try {
      await api.excluirCorpo(sistema.id, corpo.id);
      if (corpoAberto && corpoAberto.id === corpo.id) corpoAberto = null;
      await recarregar();
      notificarSucesso("Corpo celeste excluído.");
    } catch (erro) {
      notificarErro(erro);
    }
  }

  async function gerarCorpos() {
    const jaTemCorpos = sistema.counts.bodies > 0;
    if (jaTemCorpos) {
      const confirmado = await confirmar({
        titulo: "Gerar corpos celestes",
        mensagem: `O sistema ${sistema.name} já tem ${sistema.counts.bodies} corpo(s) em órbita.`,
        impacto: "A geração substitui todos eles (as estrelas são mantidas).",
        textoConfirmar: "Substituir",
      });
      if (!confirmado) return;
    }

    try {
      const atualizado = await api.gerarConteudo(sistema.id, { substituir: jaTemCorpos });
      await recarregar();
      notificarSucesso(`${atualizado.gerados} corpo(s) gerado(s).`);
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
