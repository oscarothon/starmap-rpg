/**
 * Diagrama do sistema: estrelas, órbitas e hierarquia.
 *
 * Cada linha horizontal é um centro de órbita. A primeira é o centro do sistema
 * — onde ficam as estrelas — e recebe os corpos que não orbitam ninguém. Uma
 * estrela que tem corpos próprios ganha a sua própria linha, para ficar claro
 * quem orbita o quê num sistema múltiplo.
 *
 * Passar o mouse sobre um corpo mostra o nome; clicar abre a ficha dele.
 */

import { corDaEstrela } from "../shared/catalogo.js";
import { svg } from "../shared/dom.js";

const LARGURA = 344;
const ALTURA_DA_LINHA = 58;
const MARGEM_SUPERIOR = 26;
const INICIO_DA_ORBITA = 74;
const RAIO = { star: 9, planet: 6, moon: 3, belt: 4, station: 4, anomaly: 5 };

export function desenharMapaDoSistema(sistema, { aoEscolherCorpo } = {}) {
  const linhas = montarLinhas(sistema);
  const altura = MARGEM_SUPERIOR + Math.max(1, linhas.length) * ALTURA_DA_LINHA;

  const dica = svg("text", {
    classe: "mapa-sistema__dica",
    x: LARGURA / 2,
    y: 14,
    "text-anchor": "middle",
  });

  const raiz = svg("svg", {
    classe: "mapa-sistema",
    viewBox: `0 0 ${LARGURA} ${altura}`,
    role: "img",
    "aria-label": "Diagrama do sistema",
  });

  const mostrarDica = (texto) => {
    dica.textContent = texto;
    dica.classList.add("mapa-sistema__dica--visivel");
  };
  const esconderDica = () => dica.classList.remove("mapa-sistema__dica--visivel");

  linhas.forEach((linha, indice) => {
    const y = MARGEM_SUPERIOR + indice * ALTURA_DA_LINHA + ALTURA_DA_LINHA / 2;
    raiz.appendChild(desenharLinha(linha, y, { mostrarDica, esconderDica, aoEscolherCorpo }));
  });

  raiz.appendChild(dica);
  raiz.addEventListener("mouseleave", esconderDica);
  return raiz;
}

/**
 * Organiza os corpos em linhas de órbita a partir da árvore do sistema.
 * Exportada para teste: é a regra que decide quem orbita o quê.
 */
export function montarLinhas(sistema) {
  const raizes = sistema.bodies || [];
  const estrelas = raizes.filter((corpo) => corpo.body_type === "star");
  const noCentro = raizes.filter((corpo) => corpo.body_type !== "star");

  const linhas = [{ tipo: "centro", estrelas, corpos: noCentro }];

  for (const estrela of estrelas) {
    if (estrela.children && estrela.children.length) {
      linhas.push({ tipo: "estrela", estrelas: [estrela], corpos: estrela.children });
    }
  }
  return linhas;
}

function desenharLinha(linha, y, manipuladores) {
  const grupo = svg("g", { classe: "mapa-sistema__linha" });
  const ancora = desenharAncora(linha, y, manipuladores);
  grupo.appendChild(ancora);

  if (linha.corpos.length) {
    grupo.appendChild(
      svg("line", {
        classe: "mapa-sistema__orbita",
        x1: INICIO_DA_ORBITA - 18,
        y1: y,
        x2: LARGURA - 12,
        y2: y,
      })
    );
  }

  const passo = Math.min(
    46,
    (LARGURA - INICIO_DA_ORBITA - 16) / Math.max(linha.corpos.length, 1)
  );

  linha.corpos.forEach((corpo, indice) => {
    const x = INICIO_DA_ORBITA + indice * passo + passo / 2;
    grupo.appendChild(desenharCorpo(corpo, x, y, manipuladores));

    // Luas ficam empilhadas acima do corpo, ligadas por um fio curto.
    (corpo.children || []).forEach((lua, ordem) => {
      const yLua = y - 15 - ordem * 8;
      grupo.appendChild(
        svg("line", { classe: "mapa-sistema__fio", x1: x, y1: y, x2: x, y2: yLua })
      );
      grupo.appendChild(desenharCorpo(lua, x, yLua, manipuladores));
    });
  });

  return grupo;
}

/** Âncora da linha: as estrelas (no centro do sistema) ou uma estrela só. */
function desenharAncora(linha, y, manipuladores) {
  const grupo = svg("g", { classe: "mapa-sistema__ancora" });
  const estrelas = linha.estrelas;

  if (!estrelas.length) {
    grupo.appendChild(
      svg("text", {
        classe: "mapa-sistema__rotulo-ancora",
        x: 8,
        y: y + 3,
        texto: "sem estrela",
      })
    );
    return grupo;
  }

  // Estrelas do centro ficam agrupadas em torno do baricentro.
  const espacamento = Math.min(22, 44 / estrelas.length);
  const inicio = 26 - ((estrelas.length - 1) * espacamento) / 2;

  if (estrelas.length > 1 && linha.tipo === "centro") {
    grupo.appendChild(
      svg("line", {
        classe: "mapa-sistema__baricentro",
        x1: inicio,
        y1: y,
        x2: inicio + (estrelas.length - 1) * espacamento,
        y2: y,
      })
    );
  }

  estrelas.forEach((estrela, indice) => {
    grupo.appendChild(
      desenharCorpo(estrela, inicio + indice * espacamento, y, manipuladores, {
        tamanho: estrelas.length > 2 ? 7 : RAIO.star,
      })
    );
  });
  return grupo;
}

function desenharCorpo(corpo, x, y, { mostrarDica, esconderDica, aoEscolherCorpo }, opcoes = {}) {
  const raio = opcoes.tamanho || RAIO[corpo.body_type] || 5;
  const ehEstrela = corpo.body_type === "star";

  const forma = ehEstrela
    ? svg("circle", {
        classe: "mapa-sistema__estrela",
        cx: 0,
        cy: 0,
        r: raio,
        fill: corDaEstrela(corpo.star_class),
      })
    : formaDoCorpo(corpo, raio);

  const grupo = svg(
    "g",
    {
      classe: `mapa-sistema__corpo${corpo.is_colonized ? " mapa-sistema__corpo--colonizado" : ""}`,
      transform: `translate(${x} ${y})`,
      dataset: { corpo: corpo.id, tipo: corpo.body_type },
      tabindex: "0",
      role: "button",
    },
    [
      ehEstrela
        ? svg("circle", {
            classe: "mapa-sistema__brilho",
            r: raio * 2.1,
            fill: corDaEstrela(corpo.star_class),
          })
        : null,
      forma,
    ]
  );

  const texto = ehEstrela ? `${corpo.name} · ${corpo.star_class || "classe não informada"}` : corpo.name;
  grupo.addEventListener("mouseenter", () => mostrarDica(texto));
  grupo.addEventListener("focus", () => mostrarDica(texto));
  grupo.addEventListener("mouseleave", esconderDica);
  grupo.addEventListener("blur", esconderDica);
  if (aoEscolherCorpo) {
    grupo.addEventListener("click", () => aoEscolherCorpo(corpo));
    grupo.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        aoEscolherCorpo(corpo);
      }
    });
  }
  return grupo;
}

/** Cada tipo de corpo tem uma silhueta própria, para diferenciar sem legenda. */
function formaDoCorpo(corpo, raio) {
  if (corpo.body_type === "belt") {
    return svg("line", {
      classe: "mapa-sistema__cinturao",
      x1: -12,
      y1: 0,
      x2: 12,
      y2: 0,
    });
  }
  if (corpo.body_type === "station") {
    return svg("rect", {
      classe: "mapa-sistema__marcador",
      x: -raio,
      y: -raio,
      width: raio * 2,
      height: raio * 2,
    });
  }
  if (corpo.body_type === "anomaly") {
    return svg("polygon", {
      classe: "mapa-sistema__marcador",
      points: `0,${-raio} ${raio},0 0,${raio} ${-raio},0`,
    });
  }
  return svg("circle", { classe: "mapa-sistema__marcador", cx: 0, cy: 0, r: raio });
}
