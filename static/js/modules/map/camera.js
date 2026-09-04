/**
 * Câmera do mapa: conversão entre coordenadas do mundo e da tela, zoom com
 * foco no cursor, deslocamento e enquadramento.
 *
 * Módulo de matemática pura (sem DOM) — é o que os testes de unidade cobrem.
 * A mesma transformação alimenta a camada SVG e a camada Canvas.
 */

export const ESCALA_MINIMA = 0.05;
export const ESCALA_MAXIMA = 40;

export function criarCamera(opcoes = {}) {
  const estado = {
    x: opcoes.x ?? 0,
    y: opcoes.y ?? 0,
    escala: limitarEscala(opcoes.escala ?? 1, opcoes),
    escalaMinima: opcoes.escalaMinima ?? ESCALA_MINIMA,
    escalaMaxima: opcoes.escalaMaxima ?? ESCALA_MAXIMA,
  };

  return {
    get x() {
      return estado.x;
    },
    get y() {
      return estado.y;
    },
    get escala() {
      return estado.escala;
    },

    /** Ponto do mundo -> pixel na tela. */
    paraTela(ponto) {
      return {
        x: ponto.x * estado.escala + estado.x,
        y: ponto.y * estado.escala + estado.y,
      };
    },

    /** Pixel na tela -> ponto do mundo. */
    paraMundo(ponto) {
      return {
        x: (ponto.x - estado.x) / estado.escala,
        y: (ponto.y - estado.y) / estado.escala,
      };
    },

    /** Move a câmera em pixels de tela. */
    deslocar(dx, dy) {
      estado.x += dx;
      estado.y += dy;
      return this;
    },

    /**
     * Aplica zoom mantendo fixo o ponto de tela informado (foco do cursor).
     * O fator é reajustado quando a escala bate nos limites, para o ponto
     * continuar ancorado.
     */
    aplicarZoom(fator, pontoTela = { x: 0, y: 0 }) {
      const novaEscala = limitarEscala(estado.escala * fator, estado);
      const fatorReal = novaEscala / estado.escala;
      estado.x = pontoTela.x - (pontoTela.x - estado.x) * fatorReal;
      estado.y = pontoTela.y - (pontoTela.y - estado.y) * fatorReal;
      estado.escala = novaEscala;
      return this;
    },

    /** Centraliza um ponto do mundo na viewport, opcionalmente mudando a escala. */
    centralizarEm(pontoMundo, viewport, escala = estado.escala) {
      estado.escala = limitarEscala(escala, estado);
      estado.x = viewport.largura / 2 - pontoMundo.x * estado.escala;
      estado.y = viewport.altura / 2 - pontoMundo.y * estado.escala;
      return this;
    },

    /** Enquadra uma caixa do mundo dentro da viewport, com margem em pixels. */
    enquadrar(limites, viewport, margem = 80) {
      const largura = Math.max(limites.maxX - limites.minX, 1e-6);
      const altura = Math.max(limites.maxY - limites.minY, 1e-6);
      // Viewports muito pequenas (ou ainda sem layout) não podem virar escala
      // negativa: sobra sempre pelo menos um pixel útil.
      const disponivelX = Math.max(viewport.largura - margem * 2, 1);
      const disponivelY = Math.max(viewport.altura - margem * 2, 1);
      const escala = limitarEscala(
        Math.min(disponivelX / largura, disponivelY / altura),
        estado
      );
      const centro = {
        x: (limites.minX + limites.maxX) / 2,
        y: (limites.minY + limites.maxY) / 2,
      };
      return this.centralizarEm(centro, viewport, escala);
    },

    /** Transformação para o atributo `transform` do <g> raiz do SVG. */
    transformacaoSvg() {
      return `translate(${estado.x} ${estado.y}) scale(${estado.escala})`;
    },

    /** Mesma transformação, no formato aceito por ctx.setTransform. */
    transformacaoCanvas() {
      return [estado.escala, 0, 0, estado.escala, estado.x, estado.y];
    },
  };
}

/** Caixa que engloba todos os pontos informados. */
export function limitesDe(pontos, preenchimento = 40) {
  if (!pontos.length) {
    return { minX: -100, minY: -100, maxX: 100, maxY: 100 };
  }
  const xs = pontos.map((ponto) => ponto.x);
  const ys = pontos.map((ponto) => ponto.y);
  return {
    minX: Math.min(...xs) - preenchimento,
    minY: Math.min(...ys) - preenchimento,
    maxX: Math.max(...xs) + preenchimento,
    maxY: Math.max(...ys) + preenchimento,
  };
}

function limitarEscala(escala, limites) {
  const minima = limites.escalaMinima ?? ESCALA_MINIMA;
  const maxima = limites.escalaMaxima ?? ESCALA_MAXIMA;
  return Math.min(Math.max(escala, minima), maxima);
}
