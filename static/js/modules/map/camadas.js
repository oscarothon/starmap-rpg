/**
 * Gerenciador de camadas do mapa.
 *
 * Ponto de extensão principal da tela: uma camada nova (atividade pirata,
 * marcadores de boletins, rotas comerciais...) é um objeto com esta interface
 * registrado aqui — nada mais do mapa precisa mudar.
 *
 *   { id, rotulo, visivel, desenhar(contexto), legenda() }
 */

import { el } from "../shared/dom.js";

const CHAVE_ARMAZENAMENTO = "starmap:camadas";

export function criarGerenciadorCamadas() {
  const camadas = new Map();
  const preferencias = carregarPreferencias();
  const ouvintes = new Set();

  function salvar() {
    const estado = {};
    for (const [id, camada] of camadas) estado[id] = camada.visivel;
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
    } catch (erro) {
      /* navegação privada / storage bloqueado: seguir sem persistir */
    }
  }

  const gerenciador = {
    registrar(camada) {
      const visivel = preferencias[camada.id] ?? camada.visivel ?? true;
      camadas.set(camada.id, { ...camada, visivel });
      return gerenciador;
    },

    listar() {
      return [...camadas.values()];
    },

    obter(id) {
      return camadas.get(id);
    },

    estaVisivel(id) {
      const camada = camadas.get(id);
      return Boolean(camada && camada.visivel);
    },

    definirVisibilidade(id, visivel) {
      const camada = camadas.get(id);
      if (!camada) return gerenciador;
      camada.visivel = Boolean(visivel);
      salvar();
      ouvintes.forEach((ouvinte) => ouvinte(id, camada.visivel));
      return gerenciador;
    },

    alternar(id) {
      return gerenciador.definirVisibilidade(id, !gerenciador.estaVisivel(id));
    },

    aoMudar(ouvinte) {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },

    /** Desenha as camadas visíveis, na ordem de registro. */
    desenhar(contexto) {
      for (const camada of camadas.values()) {
        if (camada.desenhar) camada.desenhar(contexto, camada.visivel);
      }
    },

    /** Itens de legenda das camadas visíveis que oferecem legenda. */
    legenda() {
      const itens = [];
      for (const camada of camadas.values()) {
        if (camada.visivel && camada.legenda) itens.push(...camada.legenda());
      }
      return itens;
    },

    /** Monta a lista de checkboxes do painel de camadas. */
    montarControles(container) {
      container.textContent = "";
      for (const camada of camadas.values()) {
        const entrada = el("input", {
          type: "checkbox",
          "data-camada": camada.id,
          onChange: (evento) =>
            gerenciador.definirVisibilidade(camada.id, evento.target.checked),
        });
        entrada.checked = camada.visivel;
        container.appendChild(
          el("label", { classe: "camada-item" }, [
            entrada,
            el("span", { texto: camada.rotulo }),
          ])
        );
      }
      return container;
    },
  };

  return gerenciador;
}

function carregarPreferencias() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO) || "{}");
  } catch (erro) {
    return {};
  }
}
