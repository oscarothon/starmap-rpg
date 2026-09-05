/**
 * Página de Glossário: renderiza o catálogo do backend como referência de
 * consulta. Não há conteúdo escrito aqui — tudo vem de
 * `backend/modules/catalog/dados.py`, o mesmo que alimenta os formulários.
 */

import { carregarCatalogo, catalogo } from "./modules/shared/catalogo.js";
import { el, limpar, numero, svg } from "./modules/shared/dom.js";
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
    montar: (dados) => cartoes(dados.tipos_de_rota, cartaoDeRota),
  },
  {
    id: "arranjos",
    titulo: "Arranjos estelares",
    resumo:
      "Sistemas com mais de uma estrela se organizam de formas diferentes, e o arranjo " +
      "decide onde os mundos podem se formar.",
    montar: (dados) => cartoes(dados.arranjos_estelares, cartaoDeArranjo),
  },
  {
    id: "presets",
    titulo: "Vocações de sistema",
    resumo:
      "Usadas na geração aleatória: cada vocação restringe os perfis de ocupação plausíveis " +
      "e empurra as métricas na direção certa.",
    montar: (dados) => cartoes(dados.presets_de_sistema, cartaoDePreset),
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

/** Cartão de rota com a amostra do traço usado no mapa. */
function cartaoDeRota(tipo) {
  return el("article", { classe: "cartao" }, [
    el("div", { classe: "cartao__topo" }, [
      amostraDeRota(tipo.codigo),
      el("h3", { classe: "cartao__titulo", texto: tipo.nome }),
    ]),
    el("p", { classe: "cartao__resumo", texto: tipo.resumo }),
    el("p", { classe: "cartao__texto", texto: tipo.descricao }),
  ]);
}

function cartaoDeArranjo(arranjo) {
  const quantidades = arranjo.estrelas
    .map((quantidade) => `${quantidade} estrela${quantidade > 1 ? "s" : ""}`)
    .join(" ou ");

  return el("article", { classe: "cartao" }, [
    el("h3", { classe: "cartao__titulo", texto: arranjo.nome }),
    el("p", { classe: "cartao__resumo", texto: arranjo.resumo }),
    el("p", { classe: "cartao__texto", texto: arranjo.descricao }),
    el("div", { classe: "cartao__rodape" }, [
      el("span", { classe: "rotulo", texto: "Composição" }),
      el("span", { classe: "cartao__dado", texto: quantidades }),
    ]),
  ]);
}

function cartaoDePreset(preset) {
  const enfases = Object.entries(preset.enfases || {})
    .sort(([, a], [, b]) => b - a)
    .map(([codigo, valor]) =>
      el("span", {
        classe: `etiqueta etiqueta--${valor >= 0 ? "alta" : "baixa"}`,
        texto: `${nomeDaMetrica(codigo)} ${valor >= 0 ? "↑" : "↓"}`,
      })
    );

  return el("article", { classe: "cartao" }, [
    el("h3", { classe: "cartao__titulo", texto: preset.nome }),
    el("p", { classe: "cartao__resumo", texto: preset.resumo }),
    el("p", { classe: "cartao__texto", texto: preset.descricao }),
    enfases.length
      ? el("div", { classe: "cartao__etiquetas" }, enfases)
      : el("p", { classe: "cartao__texto", texto: "Sem métricas: o sistema está vazio." }),
  ]);
}

function nomeDaMetrica(codigo) {
  const metrica = catalogo().metricas.find((item) => item.codigo === codigo);
  return metrica ? metrica.nome : codigo;
}

/** Amostra do traço de uma rota: o estilo vem do mesmo CSS que o mapa usa. */
function amostraDeRota(codigo) {
  return svg("svg", { classe: "amostra-rota", viewBox: "0 0 34 8", "aria-hidden": "true" }, [
    svg("line", { classe: `rota rota--${codigo}`, x1: 1, y1: 4, x2: 33, y2: 4 }),
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
  // Coluna própria: "10.000.000.000+" não cabe na largura das faixas de métrica,
  // que vão só até 100.
  return el("div", { classe: "faixas faixas--populacao" }, [
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
