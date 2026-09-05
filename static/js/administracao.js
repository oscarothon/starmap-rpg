/**
 * Tela de administração de regiões e facções.
 *
 * Entidades de baixa cardinalidade que mudam pouco, mas precisam ser criadas e
 * removidas sem tocar em arquivo: lista + diálogo de formulário, reaproveitando
 * os mesmos componentes do mapa.
 */

import { api } from "./modules/shared/api.js";
import { carregarCatalogo, opcoesDeNivelDeRegiao } from "./modules/shared/catalogo.js";
import { abrirDialogo, confirmar } from "./modules/shared/dialogo.js";
import { el, limpar } from "./modules/shared/dom.js";
import { notificarErro, notificarSucesso } from "./modules/shared/notificacoes.js";
import { formularioFaccao, formularioRegiao } from "./modules/systems/formularios.js";

const estado = { regioes: [], faccoes: [] };

async function carregar() {
  try {
    await carregarCatalogo();
    [estado.regioes, estado.faccoes] = await Promise.all([
      api.listarRegioes(),
      api.listarFaccoes(),
    ]);
    desenharRegioes();
    desenharFaccoes();
    document.getElementById("admin-resumo").textContent =
      `${estado.regioes.length} regiões · ${estado.faccoes.length} facções`;
  } catch (erro) {
    notificarErro(erro);
  }
}

// --- Regiões -----------------------------------------------------------------

function nomeDaRegiaoSuperior(regiao) {
  if (!regiao.parent_id) return "—";
  const pai = estado.regioes.find((item) => item.id === regiao.parent_id);
  return pai ? pai.name : "—";
}

function nomeDoNivel(codigo) {
  const opcao = opcoesDeNivelDeRegiao().find(([valor]) => valor === codigo);
  return opcao ? opcao[1] : codigo;
}

function desenharRegioes() {
  const lista = limpar(document.getElementById("lista-regioes"));
  if (!estado.regioes.length) {
    lista.appendChild(el("div", { classe: "vazio", texto: "Nenhuma região cadastrada" }));
    return;
  }

  for (const regiao of estado.regioes) {
    lista.appendChild(
      el("div", { classe: "registro", dataset: { regiao: regiao.id } }, [
        el("div", { classe: "registro__texto" }, [
          el("div", { classe: "registro__nome", texto: regiao.name }),
          el("div", { classe: "registro__detalhe" }, [
            el("span", { texto: nomeDoNivel(regiao.level) }),
            el("span", { texto: `dentro de: ${nomeDaRegiaoSuperior(regiao)}` }),
          ]),
        ]),
        el("div", { classe: "registro__acoes" }, [
          el("button", {
            classe: "botao",
            texto: "Editar",
            type: "button",
            onClick: () => abrirFormularioRegiao(regiao),
          }),
          el("button", {
            classe: "botao botao--perigo",
            texto: "Excluir",
            type: "button",
            onClick: () => excluirRegiao(regiao),
          }),
        ]),
      ])
    );
  }
}

async function abrirFormularioRegiao(regiao = null) {
  const formulario = formularioRegiao(regiao || {}, {
    regioes: estado.regioes,
    niveis: opcoesDeNivelDeRegiao(),
  });

  const salvou = await abrirDialogo({
    titulo: regiao ? `Editar ${regiao.name}` : "Nova região",
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
            if (regiao) await api.atualizarRegiao(regiao.id, valores);
            else await api.criarRegiao(valores);
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
    await carregar();
    notificarSucesso(regiao ? "Região atualizada." : "Região criada.");
  }
}

async function excluirRegiao(regiao) {
  try {
    const impacto = await api.impactoRegiao(regiao.id);
    const confirmado = await confirmar({
      titulo: "Excluir região",
      mensagem: `Excluir a região ${regiao.name}?`,
      impacto:
        `${impacto.systems} sistema(s) ficarão sem região e ` +
        `${impacto.subregions} região(ões) interna(s) subirão um nível. ` +
        "Nenhum sistema é apagado.",
    });
    if (!confirmado) return;

    await api.excluirRegiao(regiao.id);
    await carregar();
    notificarSucesso("Região excluída.");
  } catch (erro) {
    notificarErro(erro);
  }
}

// --- Facções -----------------------------------------------------------------

function desenharFaccoes() {
  const lista = limpar(document.getElementById("lista-faccoes"));
  if (!estado.faccoes.length) {
    lista.appendChild(el("div", { classe: "vazio", texto: "Nenhuma facção cadastrada" }));
    return;
  }

  for (const faccao of estado.faccoes) {
    lista.appendChild(
      el("div", { classe: "registro", dataset: { faccao: faccao.id } }, [
        el("span", { classe: "registro__cor", style: `background:${faccao.color_hex}` }),
        el("div", { classe: "registro__texto" }, [
          el("div", { classe: "registro__nome", texto: faccao.name }),
          el("div", { classe: "registro__detalhe" }, [
            el("span", { texto: faccao.short_name || "sem sigla" }),
            el("span", { texto: faccao.description || "sem descrição" }),
          ]),
        ]),
        el("div", { classe: "registro__acoes" }, [
          el("button", {
            classe: "botao",
            texto: "Editar",
            type: "button",
            onClick: () => abrirFormularioFaccao(faccao),
          }),
          el("button", {
            classe: "botao botao--perigo",
            texto: "Excluir",
            type: "button",
            onClick: () => excluirFaccao(faccao),
          }),
        ]),
      ])
    );
  }
}

async function abrirFormularioFaccao(faccao = null) {
  const formulario = formularioFaccao(faccao || {});

  const salvou = await abrirDialogo({
    titulo: faccao ? `Editar ${faccao.name}` : "Nova facção",
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
            if (faccao) await api.atualizarFaccao(faccao.id, valores);
            else await api.criarFaccao(valores);
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
    await carregar();
    notificarSucesso(faccao ? "Facção atualizada." : "Facção criada.");
  }
}

async function excluirFaccao(faccao) {
  try {
    const impacto = await api.impactoFaccao(faccao.id);
    const confirmado = await confirmar({
      titulo: "Excluir facção",
      mensagem: `Excluir a facção ${faccao.name}?`,
      impacto:
        `${impacto.systems} sistema(s) ficarão independentes e ` +
        `${impacto.influences} registro(s) de influência serão removidos.`,
    });
    if (!confirmado) return;

    await api.excluirFaccao(faccao.id);
    await carregar();
    notificarSucesso("Facção excluída.");
  } catch (erro) {
    notificarErro(erro);
  }
}

document.getElementById("botao-nova-regiao").addEventListener("click", () => abrirFormularioRegiao());
document.getElementById("botao-nova-faccao").addEventListener("click", () => abrirFormularioFaccao());
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && !evento.target.matches("input, textarea, select")) {
    window.location.href = "/";
  }
});

carregar();
