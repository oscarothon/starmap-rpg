import { describe, expect, it } from "vitest";

import { ESCALA_MAXIMA, ESCALA_MINIMA, criarCamera, limitesDe } from "../../static/js/modules/map/camera.js";

const VIEWPORT = { largura: 1000, altura: 600 };

describe("conversão entre mundo e tela", () => {
  it("converte ida e volta sem perder o ponto", () => {
    const camera = criarCamera({ x: 120, y: -40, escala: 2.5 });
    const original = { x: 37, y: -18 };

    const tela = camera.paraTela(original);
    const volta = camera.paraMundo(tela);

    expect(volta.x).toBeCloseTo(original.x);
    expect(volta.y).toBeCloseTo(original.y);
  });

  it("aplica escala e translação na projeção", () => {
    const camera = criarCamera({ x: 10, y: 20, escala: 2 });
    expect(camera.paraTela({ x: 5, y: 5 })).toEqual({ x: 20, y: 30 });
  });
});

describe("zoom", () => {
  it("mantém fixo o ponto sob o cursor", () => {
    const camera = criarCamera({ escala: 1 });
    const foco = { x: 400, y: 300 };
    const mundoAntes = camera.paraMundo(foco);

    camera.aplicarZoom(2.4, foco);
    const mundoDepois = camera.paraMundo(foco);

    expect(mundoDepois.x).toBeCloseTo(mundoAntes.x);
    expect(mundoDepois.y).toBeCloseTo(mundoAntes.y);
    expect(camera.escala).toBeCloseTo(2.4);
  });

  it("respeita a escala máxima sem desancorar o ponto", () => {
    const camera = criarCamera({ escala: ESCALA_MAXIMA });
    const foco = { x: 100, y: 100 };
    const mundoAntes = camera.paraMundo(foco);

    camera.aplicarZoom(10, foco);

    expect(camera.escala).toBe(ESCALA_MAXIMA);
    expect(camera.paraMundo(foco).x).toBeCloseTo(mundoAntes.x);
  });

  it("respeita a escala mínima", () => {
    const camera = criarCamera({ escala: ESCALA_MINIMA });
    camera.aplicarZoom(0.01, { x: 0, y: 0 });
    expect(camera.escala).toBe(ESCALA_MINIMA);
  });
});

describe("deslocamento e centralização", () => {
  it("desloca em pixels de tela", () => {
    const camera = criarCamera({ x: 0, y: 0, escala: 3 });
    camera.deslocar(15, -25);
    expect([camera.x, camera.y]).toEqual([15, -25]);
  });

  it("centraliza um ponto do mundo na viewport", () => {
    const camera = criarCamera();
    camera.centralizarEm({ x: 200, y: 100 }, VIEWPORT, 2);

    const tela = camera.paraTela({ x: 200, y: 100 });
    expect(tela.x).toBeCloseTo(VIEWPORT.largura / 2);
    expect(tela.y).toBeCloseTo(VIEWPORT.altura / 2);
  });
});

describe("enquadramento", () => {
  it("coloca todos os pontos dentro da viewport", () => {
    const pontos = [
      { x: -395, y: -140 },
      { x: 380, y: 260 },
      { x: 0, y: 0 },
    ];
    const camera = criarCamera();
    camera.enquadrar(limitesDe(pontos), VIEWPORT);

    for (const ponto of pontos) {
      const tela = camera.paraTela(ponto);
      expect(tela.x).toBeGreaterThanOrEqual(0);
      expect(tela.x).toBeLessThanOrEqual(VIEWPORT.largura);
      expect(tela.y).toBeGreaterThanOrEqual(0);
      expect(tela.y).toBeLessThanOrEqual(VIEWPORT.altura);
    }
  });

  it("não gera escala inválida quando a viewport ainda não tem layout", () => {
    const camera = criarCamera();
    camera.enquadrar(limitesDe([{ x: 0, y: 0 }, { x: 100, y: 100 }]), {
      largura: 0,
      altura: 0,
    });

    expect(camera.escala).toBeGreaterThan(0);
    expect(Number.isFinite(camera.escala)).toBe(true);
  });

  it("enquadra um único sistema sem estourar o zoom", () => {
    const camera = criarCamera();
    camera.enquadrar(limitesDe([{ x: 10, y: 10 }]), VIEWPORT);
    expect(camera.escala).toBeLessThanOrEqual(ESCALA_MAXIMA);
  });
});

describe("limitesDe", () => {
  it("aplica preenchimento ao redor dos pontos", () => {
    expect(limitesDe([{ x: 0, y: 0 }], 10)).toEqual({
      minX: -10,
      minY: -10,
      maxX: 10,
      maxY: 10,
    });
  });

  it("devolve uma caixa padrão quando não há pontos", () => {
    const limites = limitesDe([]);
    expect(limites.maxX).toBeGreaterThan(limites.minX);
  });
});

describe("transformações", () => {
  it("gera o transform do SVG", () => {
    const camera = criarCamera({ x: 5, y: 6, escala: 1.5 });
    expect(camera.transformacaoSvg()).toBe("translate(5 6) scale(1.5)");
  });

  it("gera a matriz do canvas na mesma ordem do setTransform", () => {
    const camera = criarCamera({ x: 5, y: 6, escala: 1.5 });
    expect(camera.transformacaoCanvas()).toEqual([1.5, 0, 0, 1.5, 5, 6]);
  });
});
