/** Busca de sistemas com sugestões e navegação por teclado. */

import { el, limpar } from "../shared/dom.js";

const MAXIMO_SUGESTOES = 8;

export function criarBusca({ campo, resultados, obterSistemas, aoEscolher }) {
  let sugestoes = [];
  let indiceAtivo = -1;

  function filtrar(termo) {
    const alvo = termo.trim().toLowerCase();
    if (!alvo) return [];
    return obterSistemas()
      .filter((sistema) => sistema.name.toLowerCase().includes(alvo))
      .slice(0, MAXIMO_SUGESTOES);
  }

  function desenhar() {
    limpar(resultados);
    resultados.hidden = sugestoes.length === 0;

    sugestoes.forEach((sistema, indice) => {
      resultados.appendChild(
        el(
          "button",
          {
            classe: `busca__resultado${indice === indiceAtivo ? " busca__resultado--ativo" : ""}`,
            type: "button",
            dataset: { sistema: sistema.id },
            onClick: () => escolher(sistema),
          },
          [
            el("span", { texto: sistema.name }),
            el("span", { texto: sistema.faction_name || "Independente" }),
          ]
        )
      );
    });
  }

  function escolher(sistema) {
    campo.value = "";
    sugestoes = [];
    indiceAtivo = -1;
    desenhar();
    aoEscolher(sistema);
  }

  function limparBusca() {
    campo.value = "";
    sugestoes = [];
    indiceAtivo = -1;
    desenhar();
  }

  campo.addEventListener("input", () => {
    sugestoes = filtrar(campo.value);
    indiceAtivo = sugestoes.length ? 0 : -1;
    desenhar();
  });

  campo.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      if (!sugestoes.length) return;
      const passo = evento.key === "ArrowDown" ? 1 : -1;
      indiceAtivo = (indiceAtivo + passo + sugestoes.length) % sugestoes.length;
      desenhar();
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      if (sugestoes[indiceAtivo]) escolher(sugestoes[indiceAtivo]);
    } else if (evento.key === "Escape") {
      limparBusca();
      campo.blur();
    }
  });

  document.addEventListener("click", (evento) => {
    if (!resultados.contains(evento.target) && evento.target !== campo) {
      resultados.hidden = true;
    }
  });

  return { limpar: limparBusca, filtrar };
}
