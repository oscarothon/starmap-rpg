/**
 * Tela do mapa estelar: junta câmera, camadas, renderizador, busca, painel do
 * sistema e o modo editor.
 */

import { criarBusca } from "./modules/map/busca.js";
import { criarCamera, limitesDe } from "./modules/map/camera.js";
import { criarGerenciadorCamadas } from "./modules/map/camadas.js";
import { criarPainelRota } from "./modules/map/painelRota.js";
import { criarRenderizador } from "./modules/map/renderizador.js";
import { api } from "./modules/shared/api.js";
import { carregarCatalogo, tipoDeRota } from "./modules/shared/catalogo.js";
import { abrirDialogo } from "./modules/shared/dialogo.js";
import { el, limpar, svg } from "./modules/shared/dom.js";
import { notificar, notificarErro, notificarSucesso } from "./modules/shared/notificacoes.js";
import { formularioRota, formularioSistema } from "./modules/systems/formularios.js";
import { criarPainelSistema } from "./modules/systems/painelSistema.js";

const DISTANCIA_DE_CLIQUE = 4; // px: abaixo disso, arrastar ainda conta como clique

const palco = document.getElementById("palco");
const svgMapa = document.getElementById("camada-sistemas");
const canvasHeatmap = document.getElementById("camada-heatmap");

const grupos = {
  mundo: document.getElementById("mundo"),
  fundo: document.getElementById("grupo-fundo"),
  regioes: document.getElementById("grupo-regioes"),
  rotas: document.getElementById("grupo-rotas"),
  sistemas: document.getElementById("grupo-sistemas"),
};

const estado = {
  dados: { systems: [], lanes: [], regions: [], factions: [] },
  modoEditor: false,
  ferramenta: "navegar",
  origemConexao: null,
  rotaFantasma: null,
};

const camera = criarCamera();
const camadas = criarGerenciadorCamadas();
const renderizador = criarRenderizador({ grupos, canvas: canvasHeatmap, camera, camadas });

const painel = criarPainelSistema({
  raiz: document.getElementById("painel-sistema"),
  api,
  aoMudarDados: carregarMapa,
  contexto: {
    regioes: () => estado.dados.regions,
    faccoes: () => estado.dados.factions,
  },
});

const painelRota = criarPainelRota({
  raiz: document.getElementById("painel-rota"),
  api,
  aoMudarDados: carregarMapa,
  aoFechar: () => renderizador.marcarRotaSelecionada(null),
  sistemaPorId: (id) => renderizador.sistemaPorId(id),
});

// --- Camadas ---------------------------------------------------------------

function registrarCamadas() {
  const alternarGrupo = (grupo) => (_contexto, visivel) => {
    grupo.style.display = visivel ? "" : "none";
  };

  camadas
    .registrar({
      id: "mapa-base",
      rotulo: "Mapa base",
      visivel: true,
      desenhar: alternarGrupo(grupos.fundo),
    })
    .registrar({
      id: "rotas",
      rotulo: "Rotas",
      visivel: true,
      desenhar: alternarGrupo(grupos.rotas),
      // Legenda só dos tipos que existem no mapa: o vocabulário completo é
      // assunto do glossário.
      legenda: () => {
        const presentes = new Set(estado.dados.lanes.map((rota) => rota.lane_type));
        return [...presentes]
          .map((codigo) => tipoDeRota(codigo))
          .filter(Boolean)
          .map((tipo) => ({ rotulo: tipo.nome, rota: tipo.codigo }));
      },
    })
    .registrar({
      id: "sistemas",
      rotulo: "Sistemas",
      visivel: true,
      desenhar: alternarGrupo(grupos.sistemas),
    })
    .registrar({
      id: "regioes",
      rotulo: "Nomes de região",
      visivel: true,
      desenhar: alternarGrupo(grupos.regioes),
    })
    .registrar({
      id: "influencia",
      rotulo: "Influência geopolítica",
      visivel: false,
      // O desenho em si é feito pelo renderizador na camada Canvas.
      desenhar: () => {},
      legenda: () =>
        estado.dados.factions.map((faccao) => ({
          rotulo: faccao.name,
          cor: faccao.color_hex,
        })),
    });

  camadas.montarControles(document.getElementById("lista-camadas"));
  camadas.aoMudar(() => {
    camadas.desenhar();
    renderizador.aplicarTransformacao();
    desenharLegenda();
  });
  camadas.desenhar();
}

function desenharLegenda() {
  const legenda = document.getElementById("legenda");
  const itens = camadas.legenda();
  limpar(legenda);
  legenda.hidden = itens.length === 0;
  for (const item of itens) {
    legenda.appendChild(
      el("div", { classe: "legenda__item" }, [
        // Tipo de rota entra como amostra do traço; facção, como quadrado de cor.
        item.rota ? amostraDeRota(item.rota) : el("span", { classe: "legenda__cor", style: `background:${item.cor}` }),
        el("span", { texto: item.rotulo }),
      ])
    );
  }
}

/** Traço de amostra de um tipo de rota, com o mesmo CSS que desenha o mapa. */
function amostraDeRota(codigo) {
  return svg("svg", { classe: "legenda__amostra", viewBox: "0 0 26 8" }, [
    svg("line", { classe: `rota rota--${codigo}`, x1: 0, y1: 4, x2: 26, y2: 4 }),
  ]);
}

// --- Dados -----------------------------------------------------------------

async function carregarMapa({ enquadrar = false } = {}) {
  try {
    estado.dados = await api.mapa();
    renderizador.definirDados(estado.dados);
    atualizarStatus();
    desenharLegenda();
    if (enquadrar) enquadrarTudo();
  } catch (erro) {
    notificarErro(erro);
  }
}

function atualizarStatus() {
  const contagens = estado.dados.counts || {};
  document.getElementById("status-sistemas").textContent = `${contagens.systems || 0} sistemas`;
  document.getElementById("status-rotas").textContent = `${contagens.lanes || 0} rotas`;
  document.getElementById("status-faccoes").textContent = `${contagens.factions || 0} facções`;
}

function viewport() {
  // O primeiro enquadramento pode acontecer antes de o layout existir; nesse
  // caso a janela é uma aproximação boa o bastante.
  return {
    largura: palco.clientWidth || window.innerWidth,
    altura: palco.clientHeight || window.innerHeight,
  };
}

function enquadrarTudo() {
  const sistemas = estado.dados.systems;
  camera.enquadrar(limitesDe(sistemas), viewport());
  renderizador.aplicarTransformacao();
}

function redimensionarCanvas() {
  canvasHeatmap.width = palco.clientWidth;
  canvasHeatmap.height = palco.clientHeight;
  renderizador.aplicarTransformacao();
}

// --- Navegação (pan / zoom) ------------------------------------------------

let arraste = null;

palco.addEventListener("pointerdown", (evento) => {
  if (evento.button !== 0) return;
  const noSistema = evento.target.closest(".sistema");
  // A rota é anotada aqui, e não num listener de clique no grupo de rotas:
  // o `setPointerCapture` abaixo redireciona o clique para o palco, então lá
  // o alvo já não é mais a linha. No pointerdown ele ainda é.
  const noRota = evento.target.closest("[data-rota]");

  arraste = {
    inicioX: evento.clientX,
    inicioY: evento.clientY,
    ultimoX: evento.clientX,
    ultimoY: evento.clientY,
    moveu: false,
    sistemaId: noSistema ? Number(noSistema.dataset.sistema) : null,
    rotaId: noRota ? Number(noRota.dataset.rota) : null,
    arrastandoSistema: Boolean(noSistema) && estado.modoEditor && estado.ferramenta === "navegar",
  };

  try {
    palco.setPointerCapture(evento.pointerId);
  } catch (erro) {
    /* ponteiro sintético ou já liberado: seguir sem captura */
  }
  if (!arraste.arrastandoSistema) palco.classList.add("palco--arrastando");
});

palco.addEventListener("pointermove", (evento) => {
  if (estado.origemConexao) atualizarRotaFantasma(evento);
  if (!arraste) return;

  const dx = evento.clientX - arraste.ultimoX;
  const dy = evento.clientY - arraste.ultimoY;
  arraste.ultimoX = evento.clientX;
  arraste.ultimoY = evento.clientY;

  if (
    Math.hypot(evento.clientX - arraste.inicioX, evento.clientY - arraste.inicioY) >
    DISTANCIA_DE_CLIQUE
  ) {
    arraste.moveu = true;
  }

  if (arraste.arrastandoSistema && arraste.moveu) {
    const sistema = renderizador.sistemaPorId(arraste.sistemaId);
    if (sistema) {
      renderizador.moverSistema(
        arraste.sistemaId,
        sistema.x + dx / camera.escala,
        sistema.y + dy / camera.escala
      );
    }
  } else if (!arraste.arrastandoSistema) {
    camera.deslocar(dx, dy);
    renderizador.aplicarTransformacao();
  }
});

palco.addEventListener("pointerup", async (evento) => {
  if (!arraste) return;
  const finalizado = arraste;
  arraste = null;
  palco.classList.remove("palco--arrastando");

  if (finalizado.arrastandoSistema && finalizado.moveu) {
    const sistema = renderizador.sistemaPorId(finalizado.sistemaId);
    try {
      await api.moverSistema(finalizado.sistemaId, sistema.x, sistema.y);
    } catch (erro) {
      notificarErro(erro);
      carregarMapa();
    }
    return;
  }

  if (finalizado.moveu) return;

  if (finalizado.sistemaId !== null) {
    await aoClicarEmSistema(finalizado.sistemaId);
  } else if (estado.modoEditor && estado.ferramenta === "novo-sistema") {
    // A ferramenta ativa manda: com ela ligada, o clique cria um sistema mesmo
    // que caia em cima de uma rota.
    await criarSistemaEm(evento);
  } else if (finalizado.rotaId !== null) {
    selecionarRota(finalizado.rotaId);
  } else if (estado.origemConexao) {
    cancelarConexao();
  }
});

palco.addEventListener(
  "wheel",
  (evento) => {
    evento.preventDefault();
    const retangulo = palco.getBoundingClientRect();
    const ponto = { x: evento.clientX - retangulo.left, y: evento.clientY - retangulo.top };
    camera.aplicarZoom(evento.deltaY < 0 ? 1.18 : 1 / 1.18, ponto);
    renderizador.aplicarTransformacao();
  },
  { passive: false }
);

function zoomNoCentro(fator) {
  const { largura, altura } = viewport();
  camera.aplicarZoom(fator, { x: largura / 2, y: altura / 2 });
  renderizador.aplicarTransformacao();
}

// --- Interações com sistemas -----------------------------------------------

async function aoClicarEmSistema(sistemaId) {
  if (estado.modoEditor && estado.ferramenta === "conectar") {
    await tratarConexao(sistemaId);
    return;
  }
  painelRota.fechar();
  renderizador.marcarSelecionado(sistemaId);
  await painel.mostrar(sistemaId);
}

async function criarSistemaEm(evento) {
  const retangulo = palco.getBoundingClientRect();
  const mundo = camera.paraMundo({
    x: evento.clientX - retangulo.left,
    y: evento.clientY - retangulo.top,
  });

  const formulario = formularioSistema(
    { x: mundo.x, y: mundo.y },
    { regioes: estado.dados.regions, faccoes: estado.dados.factions }
  );

  let criado = null;
  const salvou = await abrirDialogo({
    titulo: "Novo sistema estelar",
    conteudo: formulario.elemento,
    acoes: [
      { texto: "Cancelar", id: "cancelar", valor: null },
      {
        texto: "Criar",
        id: "salvar",
        classe: "botao--primario",
        aoClicar: async () => {
          try {
            criado = await api.criarSistema({
              ...formulario.valores(),
              x: mundo.x,
              y: mundo.y,
            });
            return true;
          } catch (erro) {
            notificarErro(erro);
            return false;
          }
        },
      },
    ],
    aoAbrir: (caixa) => {
      const campoNome = caixa.querySelector('[name="name"]');
      if (campoNome) campoNome.focus();
    },
  });

  if (salvou && criado) {
    await carregarMapa();
    notificarSucesso(`Sistema ${criado.name} criado.`);
    renderizador.marcarSelecionado(criado.id);
    await painel.mostrar(criado.id);
  }
}

// --- Ferramenta de conexão -------------------------------------------------

async function tratarConexao(sistemaId) {
  if (estado.origemConexao === null) {
    estado.origemConexao = sistemaId;
    marcarAlvoConexao(sistemaId, true);
    notificar("Escolha o segundo sistema da rota.");
    return;
  }
  if (estado.origemConexao === sistemaId) {
    cancelarConexao();
    return;
  }

  const origem = estado.origemConexao;
  const formulario = formularioRota();

  const salvou = await abrirDialogo({
    titulo: "Nova rota",
    conteudo: formulario.elemento,
    acoes: [
      { texto: "Cancelar", id: "cancelar", valor: null },
      {
        texto: "Criar rota",
        id: "salvar",
        classe: "botao--primario",
        aoClicar: async () => {
          try {
            await api.criarRota({
              system_a_id: origem,
              system_b_id: sistemaId,
              ...formulario.valores(),
            });
            return true;
          } catch (erro) {
            notificarErro(erro);
            return false;
          }
        },
      },
    ],
  });

  cancelarConexao();
  if (salvou) {
    await carregarMapa();
    notificarSucesso("Rota criada.");
  }
}

function marcarAlvoConexao(sistemaId, ativo) {
  const no = renderizador.noDeSistema(sistemaId);
  if (no) no.classList.toggle("sistema--alvo-conexao", ativo);
}

function cancelarConexao() {
  if (estado.origemConexao !== null) marcarAlvoConexao(estado.origemConexao, false);
  estado.origemConexao = null;
  if (estado.rotaFantasma) {
    estado.rotaFantasma.remove();
    estado.rotaFantasma = null;
  }
}

function atualizarRotaFantasma(evento) {
  const origem = renderizador.sistemaPorId(estado.origemConexao);
  if (!origem) return;

  if (!estado.rotaFantasma) {
    estado.rotaFantasma = document.createElementNS("http://www.w3.org/2000/svg", "line");
    estado.rotaFantasma.setAttribute("class", "rota rota--fantasma");
    estado.rotaFantasma.setAttribute("vector-effect", "non-scaling-stroke");
    grupos.rotas.appendChild(estado.rotaFantasma);
  }

  const retangulo = palco.getBoundingClientRect();
  const destino = camera.paraMundo({
    x: evento.clientX - retangulo.left,
    y: evento.clientY - retangulo.top,
  });

  estado.rotaFantasma.setAttribute("x1", origem.x);
  estado.rotaFantasma.setAttribute("y1", origem.y);
  estado.rotaFantasma.setAttribute("x2", destino.x);
  estado.rotaFantasma.setAttribute("y2", destino.y);
}

// --- Rotas: seleção ---------------------------------------------------------

/**
 * Clicar numa rota seleciona ela e abre o painel com a descrição — em qualquer
 * modo. A edição fica dentro do painel, visível só no modo editor.
 */
function selecionarRota(rotaId) {
  const rota = renderizador.rotaPorId(rotaId);
  if (!rota) return;

  painel.fechar();
  renderizador.marcarSelecionado(null);
  renderizador.marcarRotaSelecionada(rota.id);
  painelRota.mostrar(rota);
}

// --- Modo editor -----------------------------------------------------------

function definirModoEditor(ativo) {
  estado.modoEditor = ativo;
  estado.ferramenta = "navegar";
  cancelarConexao();

  document.body.classList.toggle("modo-editor", ativo);
  document.getElementById("botao-editor").setAttribute("aria-pressed", String(ativo));
  document.getElementById("ferramentas-editor").hidden = !ativo;
  atualizarFerramentaAtiva();
  painel.definirModoEditor(ativo);
  painelRota.definirModoEditor(ativo);
}

function definirFerramenta(ferramenta) {
  estado.ferramenta = estado.ferramenta === ferramenta ? "navegar" : ferramenta;
  cancelarConexao();
  atualizarFerramentaAtiva();
}

function atualizarFerramentaAtiva() {
  for (const botao of document.querySelectorAll("[data-ferramenta]")) {
    botao.setAttribute("aria-pressed", String(botao.dataset.ferramenta === estado.ferramenta));
  }
  palco.classList.toggle("palco--conectando", estado.ferramenta === "conectar");
}

// --- Ligações da interface -------------------------------------------------

function ligarInterface() {
  document.getElementById("botao-editor").addEventListener("click", () => {
    definirModoEditor(!estado.modoEditor);
  });

  for (const botao of document.querySelectorAll("[data-ferramenta]")) {
    botao.addEventListener("click", () => definirFerramenta(botao.dataset.ferramenta));
  }

  document.getElementById("botao-mais-zoom").addEventListener("click", () => zoomNoCentro(1.3));
  document.getElementById("botao-menos-zoom").addEventListener("click", () => zoomNoCentro(1 / 1.3));
  document.getElementById("botao-enquadrar").addEventListener("click", enquadrarTudo);

  document.getElementById("botao-camadas").addEventListener("click", () => {
    const painelCamadas = document.getElementById("painel-camadas");
    painelCamadas.hidden = !painelCamadas.hidden;
  });

  criarBusca({
    campo: document.getElementById("campo-busca"),
    resultados: document.getElementById("resultados-busca"),
    obterSistemas: () => estado.dados.systems,
    aoEscolher: async (sistema) => {
      camera.centralizarEm(sistema, viewport(), Math.max(camera.escala, 1.6));
      renderizador.aplicarTransformacao();
      renderizador.marcarSelecionado(sistema.id);
      await painel.mostrar(sistema.id);
    },
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.target.matches("input, textarea, select")) return;
    if (evento.key === "Escape") {
      if (estado.origemConexao !== null) cancelarConexao();
      else if (painelRota.rotaAtual) painelRota.fechar();
      else painel.fechar();
    } else if (evento.key.toLowerCase() === "e") {
      definirModoEditor(!estado.modoEditor);
    } else if (evento.key.toLowerCase() === "f") {
      enquadrarTudo();
    }
  });

  window.addEventListener("resize", redimensionarCanvas);

  if (window.ResizeObserver) {
    let primeiroLayout = true;
    new ResizeObserver(() => {
      redimensionarCanvas();
      if (primeiroLayout && palco.clientWidth > 0) {
        primeiroLayout = false;
        enquadrarTudo();
      }
    }).observe(palco);
  }
}

// --- Início ----------------------------------------------------------------

/** Abre direto um sistema quando a URL traz ?sistema=<id> (vindo do Índice). */
async function abrirSistemaDaUrl() {
  const parametro = new URLSearchParams(window.location.search).get("sistema");
  if (!parametro) return;

  const sistema = renderizador.sistemaPorId(Number(parametro));
  if (!sistema) return;

  camera.centralizarEm(sistema, viewport(), Math.max(camera.escala, 1.6));
  renderizador.aplicarTransformacao();
  renderizador.marcarSelecionado(sistema.id);
  await painel.mostrar(sistema.id);
}

async function iniciar() {
  registrarCamadas();
  ligarInterface();
  redimensionarCanvas();
  // O catálogo alimenta os dropdowns e as cores das estrelas: precisa estar
  // carregado antes de qualquer formulário abrir.
  await carregarCatalogo();
  await carregarMapa({ enquadrar: true });
  await abrirSistemaDaUrl();
}

iniciar();
