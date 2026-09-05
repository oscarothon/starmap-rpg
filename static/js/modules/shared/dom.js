/** Criação de elementos HTML/SVG sem framework. */

const NS_SVG = "http://www.w3.org/2000/svg";

export function el(tag, atributos = {}, filhos = []) {
  return montar(document.createElement(tag), atributos, filhos);
}

export function svg(tag, atributos = {}, filhos = []) {
  return montar(document.createElementNS(NS_SVG, tag), atributos, filhos);
}

function montar(no, atributos, filhos) {
  for (const [chave, valor] of Object.entries(atributos)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (chave === "texto") {
      no.textContent = valor;
    } else if (chave === "classe") {
      no.setAttribute("class", valor);
    } else if (chave === "dataset") {
      Object.assign(no.dataset, valor);
    } else if (chave.startsWith("on") && typeof valor === "function") {
      no.addEventListener(chave.slice(2).toLowerCase(), valor);
    } else {
      no.setAttribute(chave, valor);
    }
  }
  for (const filho of [].concat(filhos)) {
    if (filho) no.appendChild(filho);
  }
  return no;
}

export function limpar(no) {
  while (no.firstChild) no.removeChild(no.firstChild);
  return no;
}

/**
 * Anexa filhos ignorando os ausentes.
 *
 * `Node.append(null)` não ignora o nulo: ele escreve o texto "null" na tela.
 * Como os painéis montam filhos condicionais (`condicao ? el(...) : null`),
 * toda anexação passa por aqui.
 */
export function anexar(no, ...filhos) {
  for (const filho of filhos.flat()) {
    if (filho) no.appendChild(filho);
  }
  return no;
}

/** Número formatado no padrão brasileiro; "—" quando não há dado. */
export function numero(valor, vazio = "—") {
  if (valor === null || valor === undefined || valor === "") return vazio;
  return Number(valor).toLocaleString("pt-BR");
}

/** População resumida: 12.400 -> "12,4 mil", 3.2e9 -> "3,2 bi". */
export function populacao(valor) {
  const total = Number(valor || 0);
  if (!total) return "—";
  const faixas = [
    [1e12, "tri"],
    [1e9, "bi"],
    [1e6, "mi"],
    [1e3, "mil"],
  ];
  for (const [limite, sufixo] of faixas) {
    if (total >= limite) {
      const reduzido = total / limite;
      return `${reduzido.toFixed(reduzido < 10 ? 1 : 0).replace(".", ",")} ${sufixo}`;
    }
  }
  return numero(total);
}
