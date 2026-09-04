/**
 * Cliente HTTP da API. Toda escrita da aplicação passa por aqui, então é o
 * único lugar que precisa saber de rotas, cabeçalhos e formato de erro.
 */

async function requisitar(metodo, caminho, corpo) {
  const opcoes = { method: metodo, headers: {} };
  if (corpo !== undefined) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(corpo);
  }

  const resposta = await fetch(caminho, opcoes);

  if (resposta.status === 204) return null;

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) {
    const erro = new Error(
      (dados && dados.erro) || "Não foi possível completar a operação."
    );
    erro.campo = dados && dados.campo;
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

export const api = {
  // Mapa e índice
  mapa: () => requisitar("GET", "/api/map"),
  indice: () => requisitar("GET", "/api/index"),

  // Sistemas
  listarSistemas: (busca) =>
    requisitar(
      "GET",
      busca ? `/api/systems?busca=${encodeURIComponent(busca)}` : "/api/systems"
    ),
  obterSistema: (id) => requisitar("GET", `/api/systems/${id}`),
  criarSistema: (dados) => requisitar("POST", "/api/systems", dados),
  atualizarSistema: (id, dados) => requisitar("PATCH", `/api/systems/${id}`, dados),
  moverSistema: (id, x, y) => requisitar("PATCH", `/api/systems/${id}/position`, { x, y }),
  excluirSistema: (id) => requisitar("DELETE", `/api/systems/${id}`),
  impactoSistema: (id) => requisitar("GET", `/api/systems/${id}/impact`),
  definirInfluencias: (id, influences) =>
    requisitar("PUT", `/api/systems/${id}/influences`, { influences }),

  // Corpos celestes
  criarCorpo: (sistemaId, dados) =>
    requisitar("POST", `/api/systems/${sistemaId}/bodies`, dados),
  atualizarCorpo: (sistemaId, corpoId, dados) =>
    requisitar("PATCH", `/api/systems/${sistemaId}/bodies/${corpoId}`, dados),
  excluirCorpo: (sistemaId, corpoId) =>
    requisitar("DELETE", `/api/systems/${sistemaId}/bodies/${corpoId}`),

  // Rotas
  criarRota: (dados) => requisitar("POST", "/api/lanes", dados),
  atualizarRota: (id, dados) => requisitar("PATCH", `/api/lanes/${id}`, dados),
  excluirRota: (id) => requisitar("DELETE", `/api/lanes/${id}`),

  // Regiões e facções
  listarRegioes: () => requisitar("GET", "/api/regions"),
  arvoreRegioes: () => requisitar("GET", "/api/regions/tree"),
  criarRegiao: (dados) => requisitar("POST", "/api/regions", dados),
  atualizarRegiao: (id, dados) => requisitar("PATCH", `/api/regions/${id}`, dados),
  excluirRegiao: (id) => requisitar("DELETE", `/api/regions/${id}`),
  listarFaccoes: () => requisitar("GET", "/api/factions"),
  criarFaccao: (dados) => requisitar("POST", "/api/factions", dados),
  atualizarFaccao: (id, dados) => requisitar("PATCH", `/api/factions/${id}`, dados),
  excluirFaccao: (id) => requisitar("DELETE", `/api/factions/${id}`),
};
