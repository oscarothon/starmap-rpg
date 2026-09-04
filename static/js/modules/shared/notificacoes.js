/** Avisos flutuantes de curta duração (sucesso, erro, informação). */

import { el } from "./dom.js";

const DURACAO_MS = 3200;

function container() {
  let no = document.getElementById("avisos");
  if (!no) {
    no = el("div", { id: "avisos", classe: "avisos" });
    document.body.appendChild(no);
  }
  return no;
}

export function notificar(mensagem, tipo = "info") {
  const aviso = el("div", {
    classe: `aviso-flutuante aviso-flutuante--${tipo}`,
    texto: mensagem,
    role: "status",
  });
  container().appendChild(aviso);
  setTimeout(() => aviso.remove(), DURACAO_MS);
  return aviso;
}

export const notificarErro = (erro) =>
  notificar(erro && erro.message ? erro.message : String(erro), "erro");

export const notificarSucesso = (mensagem) => notificar(mensagem, "sucesso");
