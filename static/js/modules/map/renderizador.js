/**
 * Renderização do mapa.
 *
 * Camada SVG: rotas, sistemas e rótulos de região (interativos, arrastáveis).
 * Camada Canvas: mosaicos de influência (muitas células, sem interação).
 * As duas usam a mesma câmera, então ficam sempre alinhadas.
 */

import { limpar, svg } from "../shared/dom.js";

const RAIO_NUCLEO = 3.2;
const CELULA_HEATMAP = 22;
const RAIO_INFLUENCIA_MUNDO = 90;

export function criarRenderizador({ grupos, canvas, camera, camadas }) {
  let dados = { systems: [], lanes: [], regions: [], factions: [] };
  let porSistema = new Map();
  let nosSistemas = new Map();
  let selecionado = null;
  let estrelasFundo = null;

  function definirDados(novosDados) {
    dados = {
      systems: novosDados.systems || [],
      lanes: novosDados.lanes || [],
      regions: novosDados.regions || [],
      factions: novosDados.factions || [],
    };
    porSistema = new Map(dados.systems.map((sistema) => [sistema.id, sistema]));
    desenharTudo();
  }

  function desenharTudo() {
    desenharEstrelasDeFundo();
    desenharRotas();
    desenharSistemas();
    desenharRegioes();
    aplicarTransformacao();
  }

  // --- Fundo ---------------------------------------------------------------

  function desenharEstrelasDeFundo() {
    if (!grupos.fundo) return;
    if (!estrelasFundo) {
      // Distribuição fixa (semente determinística) para o fundo não "piscar".
      let semente = 20260904;
      const aleatorio = () => {
        semente = (semente * 1103515245 + 12345) % 2147483648;
        return semente / 2147483648;
      };
      estrelasFundo = Array.from({ length: 420 }, () => ({
        x: (aleatorio() - 0.5) * 4000,
        y: (aleatorio() - 0.5) * 4000,
        r: aleatorio() * 0.9 + 0.2,
        o: aleatorio() * 0.5 + 0.15,
      }));
    }
    limpar(grupos.fundo);
    for (const estrela of estrelasFundo) {
      grupos.fundo.appendChild(
        svg("circle", {
          classe: "estrela-fundo",
          cx: estrela.x,
          cy: estrela.y,
          r: estrela.r,
          opacity: estrela.o,
        })
      );
    }
  }

  // --- Rotas ---------------------------------------------------------------

  function desenharRotas() {
    limpar(grupos.rotas);
    for (const rota of dados.lanes) {
      const a = porSistema.get(rota.system_a_id);
      const b = porSistema.get(rota.system_b_id);
      if (!a || !b) continue;
      grupos.rotas.appendChild(
        svg("line", {
          classe: `rota rota--${rota.lane_type}`,
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          "vector-effect": "non-scaling-stroke",
          dataset: { rota: rota.id },
        })
      );
    }
  }

  // --- Sistemas ------------------------------------------------------------

  function desenharSistemas() {
    limpar(grupos.sistemas);
    nosSistemas = new Map();

    for (const sistema of dados.systems) {
      const cor = sistema.faction_color || "#9fb6a4";
      const conteudo = svg("g", { classe: "sistema__conteudo" }, [
        sistema.sovereign_faction_id
          ? svg("circle", {
              classe: "sistema__brilho",
              r: RAIO_NUCLEO * 3.4,
              fill: cor,
            })
          : null,
        sistema.sovereign_faction_id
          ? svg("circle", { classe: "sistema__halo", r: RAIO_NUCLEO * 2.1, stroke: cor })
          : null,
        svg("circle", { classe: "sistema__nucleo", r: RAIO_NUCLEO }),
        svg("text", {
          classe: "sistema__rotulo",
          x: RAIO_NUCLEO * 2.6,
          y: RAIO_NUCLEO + 0.5,
          texto: sistema.name.toUpperCase(),
        }),
      ]);

      const no = svg(
        "g",
        {
          classe: `sistema${sistema.is_classified ? " sistema--classificado" : ""}`,
          transform: `translate(${sistema.x} ${sistema.y})`,
          dataset: { sistema: sistema.id },
        },
        [conteudo]
      );

      nosSistemas.set(sistema.id, no);
      grupos.sistemas.appendChild(no);
    }
    if (selecionado !== null) marcarSelecionado(selecionado);
  }

  // --- Regiões -------------------------------------------------------------

  function centroidesDeRegiao() {
    const filhasDe = new Map();
    for (const regiao of dados.regions) {
      if (!filhasDe.has(regiao.parent_id)) filhasDe.set(regiao.parent_id, []);
      filhasDe.get(regiao.parent_id).push(regiao.id);
    }

    const sistemasPorRegiao = new Map();
    for (const sistema of dados.systems) {
      if (sistema.region_id === null || sistema.region_id === undefined) continue;
      if (!sistemasPorRegiao.has(sistema.region_id)) {
        sistemasPorRegiao.set(sistema.region_id, []);
      }
      sistemasPorRegiao.get(sistema.region_id).push(sistema);
    }

    const acumular = (regiaoId, visitadas = new Set()) => {
      if (visitadas.has(regiaoId)) return [];
      visitadas.add(regiaoId);
      const proprios = sistemasPorRegiao.get(regiaoId) || [];
      const descendentes = (filhasDe.get(regiaoId) || []).flatMap((filha) =>
        acumular(filha, visitadas)
      );
      return [...proprios, ...descendentes];
    };

    return dados.regions
      .map((regiao) => {
        const sistemas = acumular(regiao.id);
        if (!sistemas.length) return null;
        const soma = sistemas.reduce(
          (acumulado, sistema) => ({
            x: acumulado.x + sistema.x,
            y: acumulado.y + sistema.y,
          }),
          { x: 0, y: 0 }
        );
        return {
          regiao,
          quantidade: sistemas.length,
          x: soma.x / sistemas.length,
          y: soma.y / sistemas.length,
        };
      })
      .filter(Boolean);
  }

  function desenharRegioes() {
    limpar(grupos.regioes);
    for (const item of centroidesDeRegiao()) {
      grupos.regioes.appendChild(
        svg("text", {
          classe: "regiao__rotulo",
          x: item.x,
          y: item.y,
          "text-anchor": "middle",
          texto: item.regiao.name.toUpperCase(),
          dataset: { regiao: item.regiao.id, nivel: item.regiao.level, y: item.y },
        })
      );
    }
  }

  // --- Transformação e nível de detalhe ------------------------------------

  function aplicarTransformacao() {
    grupos.mundo.setAttribute("transform", camera.transformacaoSvg());

    // Nós e rótulos mantêm tamanho constante na tela.
    const contraEscala = 1 / camera.escala;
    for (const no of nosSistemas.values()) {
      no.firstChild.setAttribute("transform", `scale(${contraEscala})`);
    }

    aplicarNivelDeDetalhe();
    desenharHeatmap();
  }

  /** Rótulos de sistema e de região aparecem conforme o zoom. */
  function aplicarNivelDeDetalhe() {
    const escala = camera.escala;
    const mostrarRotulos = escala > 0.45 || dados.systems.length < 40;

    for (const [id, no] of nosSistemas) {
      const rotulo = no.querySelector(".sistema__rotulo");
      if (!rotulo) continue;
      const sistema = porSistema.get(id);
      const relevante = mostrarRotulos || sistema.sovereign_faction_id !== null;
      rotulo.style.display = relevante ? "" : "none";
    }

    for (const rotulo of grupos.regioes.children) {
      const nivel = rotulo.dataset.nivel;
      const tamanhoBase = { supercluster: 46, cluster: 30, subcluster: 20, local: 14 }[nivel] || 20;
      const limiteMinimo = { supercluster: 0, cluster: 0.18, subcluster: 0.5, local: 1.2 }[nivel] || 0;
      const limiteMaximo = { supercluster: 0.55, cluster: 1.6, subcluster: 5, local: 40 }[nivel] || 40;
      const visivel = escala >= limiteMinimo && escala <= limiteMaximo;
      rotulo.style.display = visivel ? "" : "none";
      const tamanho = tamanhoBase / escala;
      rotulo.setAttribute("font-size", tamanho);
      // Níveis diferentes sobem/descem em relação ao centroide para não
      // colidirem quando duas regiões têm centros próximos.
      const deslocamento = { supercluster: -1.6, cluster: -0.6, subcluster: 0.7, local: 1.7 }[nivel] || 0;
      rotulo.setAttribute("y", Number(rotulo.dataset.y) + deslocamento * tamanho);
    }
  }

  // --- Heatmap de influência (Canvas) --------------------------------------

  function desenharHeatmap() {
    if (!canvas) return;
    const contexto = canvas.getContext("2d");
    const largura = canvas.width;
    const altura = canvas.height;
    contexto.clearRect(0, 0, largura, altura);

    if (!camadas || !camadas.estaVisivel("influencia")) return;

    const comDono = dados.systems.filter((sistema) => sistema.sovereign_faction_id);
    if (!comDono.length) return;

    const projetados = comDono.map((sistema) => ({
      ...camera.paraTela(sistema),
      cor: sistema.faction_color || "#8899aa",
    }));
    const raioTela = RAIO_INFLUENCIA_MUNDO * camera.escala;

    for (let y = 0; y < altura; y += CELULA_HEATMAP) {
      for (let x = 0; x < largura; x += CELULA_HEATMAP) {
        const centroX = x + CELULA_HEATMAP / 2;
        const centroY = y + CELULA_HEATMAP / 2;

        let melhor = null;
        let menorDistancia = Infinity;
        for (const ponto of projetados) {
          const distancia = Math.hypot(ponto.x - centroX, ponto.y - centroY);
          if (distancia < menorDistancia) {
            menorDistancia = distancia;
            melhor = ponto;
          }
        }
        if (!melhor || menorDistancia > raioTela) continue;

        const intensidade = 1 - menorDistancia / raioTela;
        contexto.globalAlpha = Math.min(0.42, intensidade * 0.55);
        contexto.fillStyle = melhor.cor;
        contexto.fillRect(x + 1, y + 1, CELULA_HEATMAP - 2, CELULA_HEATMAP - 2);
      }
    }
    contexto.globalAlpha = 1;
  }

  // --- Seleção -------------------------------------------------------------

  function marcarSelecionado(id) {
    selecionado = id;
    for (const [sistemaId, no] of nosSistemas) {
      no.classList.toggle("sistema--selecionado", sistemaId === id);
    }
  }

  function moverSistema(id, x, y) {
    const sistema = porSistema.get(id);
    if (!sistema) return;
    sistema.x = x;
    sistema.y = y;
    const no = nosSistemas.get(id);
    if (no) no.setAttribute("transform", `translate(${x} ${y})`);
    desenharRotas();
    desenharRegioes();
    aplicarNivelDeDetalhe();
  }

  return {
    definirDados,
    desenharTudo,
    aplicarTransformacao,
    marcarSelecionado,
    moverSistema,
    get dados() {
      return dados;
    },
    sistemaPorId: (id) => porSistema.get(id),
    noDeSistema: (id) => nosSistemas.get(id),
  };
}
