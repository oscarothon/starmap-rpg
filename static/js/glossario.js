/**
 * Página de Glossário: renderiza o catálogo do backend como referência de
 * consulta. Não há conteúdo escrito aqui — tudo vem de
 * `backend/modules/catalog/dados.py`, o mesmo que alimenta os formulários.
 */

import { carregarCatalogo, catalogo } from "./modules/shared/catalogo.js";
import { el, limpar, numero } from "./modules/shared/dom.js";
import { notificarErro } from "./modules/shared/notificacoes.js";

const SECOES = [
  {
    id: "estrelas",
    titulo: "Classes de estrela",
    resumo:
      "A classificação espectral ordena as estrelas por temperatura. Ela define a " +
      "zona habitável, o tipo de mundo que se forma e o quanto o sistema é hostil.",
    montar: (dados) => cartoes(dados.classes_de_estrela, cartaoDeEstrela),
  },
  {
    id: "metricas",
    titulo: "Métricas do sistema",
    resumo:
      "Seis eixos de 0 a 100 descrevem o estado de um sistema. Cada faixa tem um " +
      "significado próprio — o mesmo número diz coisas diferentes em eixos diferentes.",
    montar: (dados) => dados.metricas.map(blocoDeMetrica),
  },
  {
    id: "corpos",
    titulo: "Tipos de corpo celeste",
    resumo: "O que pode existir em órbita e como cada tipo aparece no diagrama do sistema.",
    montar: (dados) => cartoes(dados.tipos_de_corpo, cartaoSimples),
  },
  {
    id: "rotas",
    titulo: "Tipos de rota",
    resumo: "As ligações entre sistemas no mapa, e o que cada uma significa para quem viaja.",
    montar: (dados) => cartoes(dados.tipos_de_rota, cartaoSimples),
  },
  {
    id: "regioes",
    titulo: "Níveis de região",
    resumo: "A hierarquia geográfica do mapa, do recorte mais amplo ao mais local.",
    montar: (dados) => cartoes(dados.niveis_de_regiao, cartaoSimples),
  },
  {
    id: "populacao",
    titulo: "Faixas de população",
    resumo: "Como o número de habitantes é lido em jogo.",
    montar: (dados) => [tabelaDePopulacao(dados.faixas_de_populacao)],
  },
];

function cartoes(itens, montar) {
  return [el("div", { classe: "cartoes" }, itens.map(montar))];
}

function cartaoDeEstrela(classe) {
  return el("article", { classe: "cartao" }, [
    el("div", { classe: "cartao__topo" }, [
      el("span", { classe: "cartao__amostra", style: `background:${classe.cor}` }),
      el("h3", { classe: "cartao__titulo", texto: classe.nome }),
    ]),
    el("p", { classe: "cartao__resumo", texto: classe.resumo }),
    el("p", { classe: "cartao__texto", texto: classe.descricao }),
    el("div", { classe: "cartao__rodape" }, [
      el("span", { classe: "rotulo", texto: "Temperatura" }),
      el("span", { classe: "cartao__dado", texto: classe.temperatura }),
    ]),
  ]);
}

function cartaoSimples(item) {
  return el("article", { classe: "cartao" }, [
    el("h3", { classe: "cartao__titulo", texto: item.nome }),
    el("p", { classe: "cartao__resumo", texto: item.resumo }),
    el("p", { classe: "cartao__texto", texto: item.descricao }),
  ]);
}

function blocoDeMetrica(metrica) {
  return el("article", { classe: "metrica" }, [
    el("h3", { classe: "cartao__titulo", texto: metrica.nome }),
    el("p", { classe: "cartao__resumo", texto: metrica.resumo }),
    el("p", { classe: "cartao__texto", texto: metrica.descricao }),
    el(
      "div",
      { classe: "faixas" },
      metrica.faixas.map((faixa) =>
        el("div", { classe: "faixa" }, [
          el("span", { classe: "faixa__intervalo", texto: `${faixa.minimo}–${faixa.maximo}` }),
          el("span", { classe: "faixa__nome", texto: faixa.nome }),
          el("span", { classe: "faixa__descricao", texto: faixa.descricao }),
        ])
      )
    ),
  ]);
}

function tabelaDePopulacao(faixas) {
  return el("div", { classe: "faixas" }, [
    ...faixas.map((faixa) =>
      el("div", { classe: "faixa" }, [
        el("span", {
          classe: "faixa__intervalo",
          texto: faixa.minimo === 0 ? "0" : `${numero(faixa.minimo)}+`,
        }),
        el("span", { classe: "faixa__nome", texto: faixa.nome }),
        el("span", { classe: "faixa__descricao", texto: faixa.resumo }),
      ])
    ),
  ]);
}

async function montar() {
  try {
    await carregarCatalogo();
  } catch (erro) {
    notificarErro(erro);
    return;
  }

  const dados = catalogo();
  const conteudo = limpar(document.getElementById("conteudo-glossario"));
  const indice = limpar(document.getElementById("indice-glossario"));

  // O overflow do body propaga para a viewport, então quem rola é o elemento
  // raiz — navegação por fragmento sozinha não dá conta aqui.
  const rolarPara = (id) => {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    document.scrollingElement.scrollTo({ top: alvo.offsetTop - 12, behavior: "smooth" });
  };

  for (const secao of SECOES) {
    indice.appendChild(
      el("a", {
        classe: "botao",
        href: `#${secao.id}`,
        texto: secao.titulo,
        onClick: (evento) => {
          evento.preventDefault();
          rolarPara(secao.id);
        },
      })
    );
    conteudo.appendChild(
      el("section", { classe: "secao", id: secao.id }, [
        el("h2", { classe: "secao__cabecalho", texto: secao.titulo }),
        el("p", { classe: "secao__resumo", texto: secao.resumo }),
        ...secao.montar(dados),
      ])
    );
  }
}

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") window.location.href = "/";
});

montar();
