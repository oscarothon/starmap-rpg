/**
 * Lógica pura do Índice de Sistemas: filtro, ordenação e agrupamento.
 * Fica separada da montagem do DOM para poder ser testada isoladamente.
 */

export const COLUNAS = [
  { chave: "name", rotulo: "Sistema", texto: true },
  { chave: "region_name", rotulo: "Região", texto: true },
  { chave: "faction_name", rotulo: "Soberania", texto: true },
  { chave: "population", rotulo: "População" },
  { chave: "star_count", rotulo: "Estrelas" },
  { chave: "planets", rotulo: "Planetas" },
  { chave: "satellites", rotulo: "Satélites" },
  { chave: "lanes", rotulo: "Rotas" },
  { chave: "economy", rotulo: "Economia" },
  { chave: "industry", rotulo: "Indústria" },
  { chave: "innovation", rotulo: "Inovação" },
  { chave: "information", rotulo: "Informação" },
  { chave: "stability", rotulo: "Estabilidade" },
  { chave: "quality_of_life", rotulo: "Qualidade de vida" },
];

/** Filtra por texto livre (nome, região, soberania) e por facções escolhidas. */
export function filtrar(sistemas, { busca = "", faccoes = [] } = {}) {
  const termo = busca.trim().toLowerCase();
  const idsFaccao = new Set(faccoes);

  return sistemas.filter((sistema) => {
    if (idsFaccao.size) {
      const id = sistema.faction_id;
      const combina = id === null || id === undefined ? idsFaccao.has(0) : idsFaccao.has(id);
      if (!combina) return false;
    }
    if (!termo) return true;
    return [sistema.name, sistema.region_name, sistema.faction_name]
      .filter(Boolean)
      .some((valor) => valor.toLowerCase().includes(termo));
  });
}

/** Ordena por uma coluna; texto vai alfabético, número vai numérico. */
export function ordenar(sistemas, campo, direcao = "asc") {
  const sinal = direcao === "desc" ? -1 : 1;
  const coluna = COLUNAS.find((item) => item.chave === campo);
  const ehTexto = Boolean(coluna && coluna.texto);

  return [...sistemas].sort((a, b) => {
    const valorA = a[campo];
    const valorB = b[campo];

    // Sistemas sem dado ficam sempre no fim, independente da direção.
    const vazioA = valorA === null || valorA === undefined || valorA === "";
    const vazioB = valorB === null || valorB === undefined || valorB === "";
    if (vazioA && vazioB) return 0;
    if (vazioA) return 1;
    if (vazioB) return -1;

    if (ehTexto) return sinal * String(valorA).localeCompare(String(valorB), "pt-BR");
    return sinal * (Number(valorA) - Number(valorB));
  });
}

/**
 * Agrupa pela região local do sistema (o passo mais específico do caminho),
 * preservando a ordem já definida. Sem região vira "Sem região".
 */
export function agruparPorRegiao(sistemas) {
  const grupos = new Map();

  for (const sistema of sistemas) {
    const caminho = sistema.region_path || [];
    const local = caminho.length ? caminho[0].name : sistema.region_name || "Sem região";
    if (!grupos.has(local)) grupos.set(local, []);
    grupos.get(local).push(sistema);
  }

  return [...grupos.entries()]
    .map(([nome, itens]) => ({ nome, sistemas: itens }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Próximo estado de ordenação ao clicar num cabeçalho. */
export function proximaOrdenacao(atual, campo) {
  if (atual.campo !== campo) return { campo, direcao: "asc" };
  return { campo, direcao: atual.direcao === "asc" ? "desc" : "asc" };
}
