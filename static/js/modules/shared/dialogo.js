/** Diálogos modais reutilizáveis: formulários e confirmação de exclusão. */

import { el, limpar } from "./dom.js";

let fundo = null;
let fecharAtual = null;

function garantirFundo() {
  if (fundo) return fundo;
  fundo = el("div", { classe: "dialogo-fundo", id: "dialogo-fundo", hidden: "" });
  fundo.addEventListener("mousedown", (evento) => {
    if (evento.target === fundo && fecharAtual) fecharAtual(null);
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && fecharAtual) fecharAtual(null);
  });
  document.body.appendChild(fundo);
  return fundo;
}

/**
 * Abre um diálogo. `conteudo` é um nó já montado; `acoes` descreve os botões.
 * Resolve com o valor passado pela ação escolhida (null se cancelado).
 */
export function abrirDialogo({ titulo, conteudo, acoes = [], aoAbrir }) {
  const raiz = garantirFundo();

  return new Promise((resolver) => {
    const fechar = (valor) => {
      raiz.hidden = true;
      limpar(raiz);
      fecharAtual = null;
      resolver(valor);
    };
    fecharAtual = fechar;

    const rodape = el(
      "div",
      { classe: "dialogo__acoes" },
      acoes.map((acao) =>
        el("button", {
          classe: `botao ${acao.classe || ""}`,
          texto: acao.texto,
          type: "button",
          "data-acao": acao.id || acao.texto,
          onClick: async () => {
            const valor = acao.aoClicar ? await acao.aoClicar() : acao.valor;
            if (valor !== false) fechar(valor === undefined ? true : valor);
          },
        })
      )
    );

    const caixa = el("div", { classe: "dialogo painel", role: "dialog" }, [
      el("div", { classe: "dialogo__topo" }, [
        el("span", { classe: "dialogo__titulo", texto: titulo }),
        el("button", {
          classe: "painel-sistema__fechar",
          texto: "×",
          type: "button",
          "aria-label": "Fechar",
          onClick: () => fechar(null),
        }),
      ]),
      el("div", { classe: "dialogo__corpo" }, [conteudo]),
      acoes.length ? rodape : null,
    ]);

    limpar(raiz).appendChild(caixa);
    raiz.hidden = false;
    if (aoAbrir) aoAbrir(caixa);
  });
}

/** Confirmação de ação destrutiva, com resumo opcional do impacto em cascata. */
export function confirmar({
  titulo = "Confirmar",
  mensagem,
  impacto = null,
  textoConfirmar = "Excluir",
}) {
  const conteudo = el("div", {}, [
    el("p", { classe: "dialogo__mensagem", texto: mensagem }),
    impacto ? el("p", { classe: "dialogo__impacto", texto: impacto }) : null,
  ]);

  return abrirDialogo({
    titulo,
    conteudo,
    acoes: [
      { texto: "Cancelar", id: "cancelar", valor: null },
      {
        texto: textoConfirmar,
        id: "confirmar",
        classe: "botao--perigo",
        valor: true,
      },
    ],
  }).then((valor) => valor === true);
}

export function fecharDialogo() {
  if (fecharAtual) fecharAtual(null);
}
