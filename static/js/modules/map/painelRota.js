/**
 * Painel da rota selecionada.
 *
 * A descrição que o mestre escreve ao criar a rota não tinha onde aparecer: o
 * mapa desenha só a linha. Clicar numa rota — em qualquer modo — seleciona ela
 * e abre este painel, que mostra o tipo, o que ele significa e a descrição.
 * No modo editor, é daqui que se edita e se exclui.
 */

import { tipoDeRota } from "../shared/catalogo.js";
import { abrirDialogo, confirmar } from "../shared/dialogo.js";
import { anexar, el, limpar, svg } from "../shared/dom.js";
import { notificarErro, notificarSucesso } from "../shared/notificacoes.js";
import { formularioRota } from "../systems/formularios.js";

export function criarPainelRota({ raiz, api, aoMudarDados, aoFechar, sistemaPorId }) {
  let rota = null;
  let modoEditor = false;

  raiz.hidden = true;

  function mostrar(novaRota) {
    rota = novaRota;
    raiz.hidden = false;
    desenhar();
  }

  function fechar() {
    if (!rota) return;
    rota = null;
    raiz.hidden = true;
    if (aoFechar) aoFechar();
  }

  function definirModoEditor(ativo) {
    modoEditor = ativo;
    if (rota) desenhar();
  }

  function nomeDoSistema(id) {
    const sistema = sistemaPorId(id);
    return sistema ? sistema.name : "sistema desconhecido";
  }

  function desenhar() {
    const tipo = tipoDeRota(rota.lane_type);

    anexar(
      limpar(raiz),
      el("div", { classe: "painel-rota__topo" }, [
        el("div", {}, [
          el("span", { classe: "rotulo", texto: "Rota" }),
          el("h2", {
            classe: "painel-rota__titulo",
            texto: `${nomeDoSistema(rota.system_a_id)} ⟷ ${nomeDoSistema(rota.system_b_id)}`,
          }),
        ]),
        el("button", {
          classe: "painel-rota__fechar",
          type: "button",
          texto: "×",
          "aria-label": "Fechar painel da rota",
          onClick: fechar,
        }),
      ]),
      el("div", { classe: "painel-rota__tipo" }, [
        amostra(rota.lane_type),
        el("span", { classe: "rotulo", texto: tipo ? tipo.nome : rota.lane_type }),
      ]),
      tipo ? el("p", { classe: "painel-rota__descricao", texto: tipo.resumo }) : null,
      el("div", { classe: "secao__titulo rotulo", texto: "Descrição" }),
      el("p", {
        classe: "painel-rota__descricao",
        texto: rota.notes || "Sem descrição registrada.",
      }),
      modoEditor
        ? el("div", { classe: "acoes-em-linha" }, [
            el("button", {
              classe: "botao",
              type: "button",
              texto: "Editar rota",
              onClick: editar,
            }),
            el("button", {
              classe: "botao botao--perigo",
              type: "button",
              texto: "Excluir",
              onClick: excluir,
            }),
          ])
        : null
    );
  }

  /** Amostra do traço, com o mesmo CSS que desenha a linha no mapa. */
  function amostra(codigo) {
    return svg("svg", { classe: "legenda__amostra", viewBox: "0 0 26 8" }, [
      svg("line", { classe: `rota rota--${codigo}`, x1: 0, y1: 4, x2: 26, y2: 4 }),
    ]);
  }

  async function editar() {
    const formulario = formularioRota(rota);
    let atualizada = null;

    const salvou = await abrirDialogo({
      titulo: "Editar rota",
      conteudo: formulario.elemento,
      acoes: [
        { texto: "Cancelar", id: "cancelar", valor: null },
        {
          texto: "Salvar",
          id: "salvar",
          classe: "botao--primario",
          aoClicar: async () => {
            try {
              atualizada = await api.atualizarRota(rota.id, formulario.valores());
              return true;
            } catch (erro) {
              notificarErro(erro);
              return false;
            }
          },
        },
      ],
    });

    if (!salvou || !atualizada) return;
    mostrar(atualizada);
    if (aoMudarDados) await aoMudarDados();
    notificarSucesso("Rota atualizada.");
  }

  async function excluir() {
    const confirmado = await confirmar({
      titulo: "Excluir rota",
      mensagem: `Excluir a rota entre ${nomeDoSistema(rota.system_a_id)} e ${nomeDoSistema(
        rota.system_b_id
      )}?`,
    });
    if (!confirmado) return;

    try {
      await api.excluirRota(rota.id);
      fechar();
      if (aoMudarDados) await aoMudarDados();
      notificarSucesso("Rota excluída.");
    } catch (erro) {
      notificarErro(erro);
    }
  }

  return {
    mostrar,
    fechar,
    definirModoEditor,
    get rotaAtual() {
      return rota;
    },
  };
}
