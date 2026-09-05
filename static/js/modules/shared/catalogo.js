/**
 * Catálogo do jogo no cliente.
 *
 * Carrega uma vez de `/api/catalog` e serve tanto os dropdowns quanto a leitura
 * de rótulos (classe de estrela, tipo de corpo, faixa de métrica). O conteúdo é
 * definido no backend, em `backend/modules/catalog/dados.py`.
 */

import { api } from "./api.js";

const VAZIO = {
  classes_de_estrela: [],
  tipos_de_corpo: [],
  metricas: [],
  tipos_de_rota: [],
  arranjos_estelares: [],
  presets_de_sistema: [],
  niveis_de_regiao: [],
  tendencias: [],
  faixas_de_populacao: [],
};

let dados = VAZIO;
let carregando = null;

export async function carregarCatalogo() {
  if (dados !== VAZIO) return dados;
  if (!carregando) {
    carregando = api
      .catalogo()
      .then((resposta) => {
        dados = resposta;
        return dados;
      })
      .finally(() => {
        carregando = null;
      });
  }
  return carregando;
}

export function catalogo() {
  return dados;
}

/** Pares [codigo, nome] prontos para montar um <select>. */
export function opcoesDe(lista, { vazio = null } = {}) {
  const opcoes = lista.map((item) => [item.codigo, item.nome]);
  return vazio ? [["", vazio], ...opcoes] : opcoes;
}

export const opcoesDeClasseDeEstrela = (vazio = null) =>
  opcoesDe(dados.classes_de_estrela, { vazio });
export const opcoesDeTipoDeCorpo = () => opcoesDe(dados.tipos_de_corpo);
export const opcoesDeTipoDeRota = () => opcoesDe(dados.tipos_de_rota);
export const opcoesDePreset = (vazio = null) => opcoesDe(dados.presets_de_sistema, { vazio });
export const opcoesDeNivelDeRegiao = () => opcoesDe(dados.niveis_de_regiao);
export const opcoesDeTendencia = () => opcoesDe(dados.tendencias);

function achar(lista, codigo) {
  return lista.find((item) => item.codigo === codigo) || null;
}

export const classeDeEstrela = (codigo) => achar(dados.classes_de_estrela, codigo);
export const tipoDeCorpo = (codigo) => achar(dados.tipos_de_corpo, codigo);
export const metrica = (codigo) => achar(dados.metricas, codigo);
export const tipoDeRota = (codigo) => achar(dados.tipos_de_rota, codigo);

export function nomeDoTipoDeRota(codigo) {
  const tipo = tipoDeRota(codigo);
  return tipo ? tipo.nome : codigo;
}

/** Cor da classe espectral, com um cinza neutro como reserva. */
export function corDaEstrela(codigo) {
  const classe = classeDeEstrela(codigo);
  return classe ? classe.cor : "#cfd6d0";
}

export function nomeDaClasse(codigo) {
  const classe = classeDeEstrela(codigo);
  return classe ? classe.nome : "Classe não informada";
}

export function nomeDoTipoDeCorpo(codigo) {
  const tipo = tipoDeCorpo(codigo);
  return tipo ? tipo.nome : codigo;
}

/** Faixa (Crítico, Baixo, ...) em que um valor de métrica cai. */
export function faixaDaMetrica(codigo, valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const item = metrica(codigo);
  if (!item) return null;
  return item.faixas.find((faixa) => valor >= faixa.minimo && valor <= faixa.maximo) || null;
}

/** Nome da faixa populacional correspondente a um número de habitantes. */
export function faixaDePopulacao(total) {
  const numero = Number(total || 0);
  let atual = null;
  for (const faixa of dados.faixas_de_populacao) {
    if (numero >= faixa.minimo) atual = faixa;
  }
  return atual;
}
