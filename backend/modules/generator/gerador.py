"""Geração aleatória de sistemas e corpos celestes.

Funções puras: recebem um `random.Random` e devolvem propostas em dicionário.
Nada aqui toca no banco — quem grava é o `routes.py`. Isso mantém a geração
testável com semente fixa e permite mostrar a proposta ao usuário antes de
salvar.

As proporções seguem a astronomia de longe: anãs vermelhas são a maioria, a
zona habitável acompanha a luminosidade da estrela e gigantes gasosos só
aparecem além da linha de gelo. O objetivo é plausibilidade para jogar, não
simulação.
"""

import random

from ..catalog.dados import CLASSES_DE_ESTRELA

# Parâmetros de formação por classe espectral.
#   zona  — faixa habitável em UA
#   gelo  — linha de gelo em UA (além dela se formam gigantes gasosos)
#   corpos — quantidade plausível de corpos em órbita
PARAMETROS_DE_FORMACAO = {
    "O": {"zona": (40, 70), "gelo": 120, "corpos": (0, 4)},
    "B": {"zona": (15, 25), "gelo": 45, "corpos": (0, 5)},
    "A": {"zona": (4, 7), "gelo": 12, "corpos": (1, 6)},
    "F": {"zona": (1.3, 2.2), "gelo": 4.0, "corpos": (2, 8)},
    "G": {"zona": (0.9, 1.4), "gelo": 2.7, "corpos": (3, 9)},
    "K": {"zona": (0.4, 0.8), "gelo": 1.5, "corpos": (2, 8)},
    "M": {"zona": (0.1, 0.3), "gelo": 0.5, "corpos": (1, 6)},
    "GIGANTE_VERMELHA": {"zona": (8, 15), "gelo": 25, "corpos": (0, 4)},
    "SUPERGIGANTE": {"zona": (60, 100), "gelo": 200, "corpos": (0, 3)},
    "ANA_BRANCA": {"zona": (0.01, 0.03), "gelo": 0.2, "corpos": (0, 3)},
    "ANA_MARROM": {"zona": (0.01, 0.03), "gelo": 0.15, "corpos": (0, 3)},
    "ESTRELA_DE_NEUTRONS": {"zona": (0.1, 0.2), "gelo": 1.0, "corpos": (0, 2)},
    "PULSAR": {"zona": (0.1, 0.2), "gelo": 1.0, "corpos": (0, 2)},
    "BURACO_NEGRO": {"zona": (0.05, 0.1), "gelo": 1.0, "corpos": (0, 2)},
    "PROTOESTRELA": {"zona": (0.5, 1.0), "gelo": 3.0, "corpos": (0, 5)},
}

PADRAO_DE_FORMACAO = {"zona": (0.8, 1.5), "gelo": 3.0, "corpos": (1, 6)}

# Perfis de ocupação: definem população e o patamar das métricas juntos, para a
# ficha não sair incoerente (sistema desabitado com economia de metrópole).
PERFIS = (
    {
        "codigo": "desabitado",
        "nome": "Desabitado",
        "peso": 30,
        "populacao": (0, 0),
        "metricas": None,
    },
    {
        "codigo": "posto",
        "nome": "Posto avançado",
        "peso": 20,
        "populacao": (40, 20_000),
        "metricas": (5, 30),
    },
    {
        "codigo": "colonia",
        "nome": "Colônia",
        "peso": 24,
        "populacao": (20_000, 5_000_000),
        "metricas": (25, 55),
    },
    {
        "codigo": "povoado",
        "nome": "Mundo povoado",
        "peso": 19,
        "populacao": (5_000_000, 3_000_000_000),
        "metricas": (40, 75),
    },
    {
        "codigo": "central",
        "nome": "Mundo central",
        "peso": 7,
        "populacao": (3_000_000_000, 20_000_000_000),
        "metricas": (60, 95),
    },
)

METRICAS = ("economy", "industry", "innovation", "information", "stability", "quality_of_life")

ROMANOS = ("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII")

# Vocabulário por zona orbital: nome descritivo e tags de ambientação.
ZONAS = {
    "escaldada": {
        "descricoes": ("Mundo escaldado", "Rocha derretida", "Mundo cinzento"),
        "tags": ("Sem atmosfera", "Face fundida", "Rochoso", "Tempestade solar", "Crateras profundas"),
    },
    "quente": {
        "descricoes": ("Mundo estufa", "Mundo velado", "Deserto tórrido"),
        "tags": ("Efeito estufa", "Atmosfera corrosiva", "Nuvens permanentes", "Vulcanismo ativo"),
    },
    "temperada": {
        "descricoes": ("Mundo temperado", "Mundo oceânico", "Mundo continental"),
        "tags": ("Água líquida", "Atmosfera respirável", "Biosfera nativa", "Estações marcadas", "Arquipélagos"),
    },
    "fria": {
        "descricoes": ("Mundo árido", "Tundra perpétua", "Deserto congelado"),
        "tags": ("Calotas polares", "Atmosfera rarefeita", "Permafrost", "Tempestades de poeira"),
    },
    "gelada": {
        "descricoes": ("Gigante gasoso", "Gigante de gelo", "Mundo glacial"),
        "tags": ("Anéis de detritos", "Cinturão de radiação", "Bandas de tempestade", "Oceano subglacial", "Metano líquido"),
    },
}

TAGS_DE_LUA = ("Sem atmosfera", "Gelo de superfície", "Aquecimento de marés", "Rotação síncrona", "Crateras profundas")
TAGS_DE_CINTURAO = ("Metais pesados", "Gelo e voláteis", "Órbitas instáveis", "Mineração intensiva")

# Sílabas para nomes de sistema — combinam em algo pronunciável em português.
INICIOS = ("Ka", "Ve", "Tor", "Nya", "Sel", "Cor", "Bra", "Zan", "Mir", "Hel", "Dun", "Ara", "Xen", "Lun", "Ryo", "Tal")
MEIOS = ("ra", "li", "mo", "va", "de", "sta", "ndi", "rre", "ku", "pha", "zi", "no")
FINAIS = ("th", "n", "s", "r", "x", "ndra", "lis", "var", "on", "mar", "que", "dor")


# --- Sistema -----------------------------------------------------------------


def _sortear_por_peso(itens, rng, chave="peso"):
    total = sum(item[chave] for item in itens)
    alvo = rng.uniform(0, total)
    acumulado = 0
    for item in itens:
        acumulado += item[chave]
        if alvo <= acumulado:
            return item
    return itens[-1]


def gerar_nome(rng):
    nome = rng.choice(INICIOS) + rng.choice(MEIOS) + rng.choice(FINAIS)
    if rng.random() < 0.18:
        nome += " " + rng.choice(("Primária", "Menor", "Maior", "Distante", "Velha"))
    return nome


def gerar_estrelas(rng, quantidade=None):
    """Estrelas do sistema. Cerca de metade dos sistemas reais é múltipla."""
    if quantidade is None:
        sorteio = rng.random()
        quantidade = 1 if sorteio < 0.58 else (2 if sorteio < 0.9 else 3)

    principal = _sortear_por_peso(CLASSES_DE_ESTRELA, rng)
    estrelas = [{"star_class": principal["codigo"], "ordem": 0}]

    # Companheiras tendem a ser menores que a primária.
    companheiras = [c for c in CLASSES_DE_ESTRELA if c["codigo"] in ("K", "M", "ANA_BRANCA", "ANA_MARROM")]
    for indice in range(1, quantidade):
        estrelas.append(
            {"star_class": _sortear_por_peso(companheiras, rng)["codigo"], "ordem": indice}
        )
    return estrelas


def gerar_metricas(perfil, rng):
    """Métricas coerentes com o perfil de ocupação, com variação por eixo."""
    if perfil["metricas"] is None:
        return {metrica: None for metrica in METRICAS}

    minimo, maximo = perfil["metricas"]
    centro = (minimo + maximo) / 2
    amplitude = (maximo - minimo) / 2
    valores = {}
    for metrica in METRICAS:
        bruto = rng.gauss(centro, amplitude * 0.55)
        valores[metrica] = int(max(0, min(100, round(bruto))))
    return valores


def gerar_populacao(perfil, rng):
    minimo, maximo = perfil["populacao"]
    if maximo == 0:
        return 0
    # Distribuição logarítmica: povoamento se concentra na base da faixa.
    expoente = rng.uniform(0, 1) ** 1.7
    return int(minimo + (maximo - minimo) * expoente)


def gerar_sistema(rng=None, com_nome=False):
    """Proposta completa de atributos de um sistema, sem gravar nada."""
    rng = rng or random.Random()
    perfil = _sortear_por_peso(PERFIS, rng)

    proposta = {
        "perfil": perfil["codigo"],
        "perfil_nome": perfil["nome"],
        "population": gerar_populacao(perfil, rng),
        "is_classified": 1 if rng.random() < 0.05 else 0,
        "stars": gerar_estrelas(rng),
        **gerar_metricas(perfil, rng),
    }
    if com_nome:
        proposta["name"] = gerar_nome(rng)
    return proposta


# --- Corpos celestes ---------------------------------------------------------


def _zona_do_raio(raio, parametros):
    interna, externa = parametros["zona"]
    if raio < interna * 0.45:
        return "escaldada"
    if raio < interna:
        return "quente"
    if raio <= externa:
        return "temperada"
    if raio < parametros["gelo"]:
        return "fria"
    return "gelada"


def _tags(rng, zona, quantidade=(1, 3)):
    vocabulario = list(ZONAS[zona]["tags"])
    rng.shuffle(vocabulario)
    return vocabulario[: rng.randint(*quantidade)]


def gerar_corpos(estrelas, nome_do_sistema, rng=None, populado=False):
    """Corpos em órbita, na ordem do raio orbital.

    Devolve uma lista plana onde cada item pode trazer `filhos` (luas). Os
    corpos orbitam o centro do sistema; a hierarquia fina (qual estrela) fica a
    cargo de quem edita depois, porque num sistema múltiplo isso é escolha de
    ambientação.
    """
    rng = rng or random.Random()
    if not estrelas:
        return []

    classe_principal = estrelas[0].get("star_class", "G")
    parametros = PARAMETROS_DE_FORMACAO.get(classe_principal, PADRAO_DE_FORMACAO)

    minimo, maximo = parametros["corpos"]
    quantidade = rng.randint(minimo, maximo)
    if quantidade == 0:
        return []

    # Órbitas crescentes, com espaçamento multiplicativo (lei de Titius-Bode em
    # espírito): cada corpo fica bem mais longe que o anterior.
    raio = parametros["zona"][0] * rng.uniform(0.25, 0.6)
    corpos = []
    indice_cinturao = rng.randint(1, max(1, quantidade - 1)) if rng.random() < 0.45 else None

    for indice in range(quantidade):
        zona = _zona_do_raio(raio, parametros)
        ordem = indice + 1

        if indice == indice_cinturao:
            corpos.append(
                {
                    "name": f"Cinturão de {nome_do_sistema}",
                    "body_type": "belt",
                    "orbital_order": ordem,
                    "orbital_radius_au": round(raio, 3),
                    "description": "Faixa de asteroides e detritos",
                    "tags": list(rng.sample(TAGS_DE_CINTURAO, rng.randint(1, 2))),
                    "filhos": [],
                }
            )
        else:
            gigante = zona == "gelada"
            corpo = {
                "name": f"{nome_do_sistema} {ROMANOS[min(indice, len(ROMANOS) - 1)]}",
                "body_type": "planet",
                "orbital_order": ordem,
                "orbital_radius_au": round(raio, 3),
                "description": rng.choice(ZONAS[zona]["descricoes"]),
                "tags": _tags(rng, zona),
                "filhos": _gerar_luas(rng, f"{nome_do_sistema} {ROMANOS[min(indice, len(ROMANOS) - 1)]}", gigante),
            }
            corpos.append(corpo)

        raio *= rng.uniform(1.5, 2.4)

    if populado:
        _marcar_colonizados(corpos, rng)
    return corpos


def _gerar_luas(rng, nome_do_planeta, gigante):
    quantidade = rng.randint(0, 5) if gigante else (rng.randint(0, 2) if rng.random() < 0.4 else 0)
    luas = []
    for indice in range(quantidade):
        luas.append(
            {
                "name": f"{nome_do_planeta} {chr(97 + indice)}",
                "body_type": "moon",
                "orbital_order": indice + 1,
                "orbital_radius_au": None,
                "description": "Satélite natural",
                "tags": list(rng.sample(TAGS_DE_LUA, rng.randint(1, 2))),
                "filhos": [],
            }
        )
    return luas


def _marcar_colonizados(corpos, rng):
    """Marca como colonizado o corpo mais habitável disponível (e talvez uma lua)."""
    candidatos = [
        corpo
        for corpo in corpos
        if corpo["body_type"] == "planet"
        and any(termo in corpo["description"].lower() for termo in ("temperado", "oceânico", "continental"))
    ]
    if not candidatos:
        candidatos = [corpo for corpo in corpos if corpo["body_type"] == "planet"]
    if not candidatos:
        return

    escolhido = rng.choice(candidatos)
    escolhido["is_colonized"] = 1

    luas = [lua for corpo in corpos for lua in corpo["filhos"]]
    if luas and rng.random() < 0.45:
        rng.choice(luas)["is_colonized"] = 1
