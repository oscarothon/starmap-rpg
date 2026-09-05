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

from ..catalog.dados import (
    ARRANJOS_ESTELARES,
    CLASSES_DE_ESTRELA,
    PRESETS_DE_SISTEMA,
    por_codigo,
)

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

# Separação entre as estrelas, em UA, por arranjo. A estreita cabe dentro do
# que seria a órbita de Mercúrio; a ampla é da ordem do cinturão de Kuiper.
SEPARACAO_POR_ARRANJO = {
    "binaria_estreita": (0.05, 0.8),
    "binaria_ampla": (40, 800),
    "hierarquica": (60, 2000),
    "trinaria": (80, 1500),
}

# Numa binária estreita as duas estrelas somam luz, então a zona habitável e a
# linha de gelo do par ficam mais longe do que as da primária sozinha.
FATOR_CIRCUMBINARIO = 1.35

# Classes que servem de companheira: a secundária costuma ser menor que a
# primária, e um objeto compacto rende boa ambientação.
CLASSES_DE_COMPANHEIRA = ("K", "M", "ANA_BRANCA", "ANA_MARROM")

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
TAG_CIRCUMBINARIA = "Órbita circumbinária"

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


def sortear_arranjo(rng, quantidade=None):
    """Arranjo estelar compatível com a quantidade de estrelas pedida."""
    candidatos = [
        arranjo
        for arranjo in ARRANJOS_ESTELARES
        if quantidade is None or quantidade in arranjo["estrelas"]
    ]
    # Quantidade fora de qualquer arranjo previsto (5 estrelas, digamos): a
    # hierárquica é a única que comporta um cortejo arbitrário.
    if not candidatos:
        return por_codigo(ARRANJOS_ESTELARES, "hierarquica")
    return _sortear_por_peso(candidatos, rng)


def _quantidade_do_arranjo(arranjo, rng):
    """Dentro de um arranjo, mais estrelas é progressivamente mais raro."""
    opcoes = arranjo["estrelas"]
    for quantidade in opcoes[:-1]:
        if rng.random() < 0.75:
            return quantidade
    return opcoes[-1]


def gerar_estrelas(rng, quantidade=None, arranjo=None):
    """Estrelas do sistema e como elas se organizam entre si.

    Devolve `{"arranjo": codigo, "estrelas": [...]}`. Cada estrela traz a classe
    espectral e, quando orbita outra (arranjo hierárquico), o índice da
    hospedeira em `orbita` e a separação em UA — é o que permite gravar a
    companheira como corpo filho da primária em vez de solta no centro.
    """
    escolhido = (
        por_codigo(ARRANJOS_ESTELARES, arranjo) if arranjo else None
    ) or sortear_arranjo(rng, quantidade)
    if quantidade is None:
        quantidade = _quantidade_do_arranjo(escolhido, rng)

    principal = _sortear_por_peso(CLASSES_DE_ESTRELA, rng)
    estrelas = [
        {
            "star_class": principal["codigo"],
            "ordem": 0,
            "orbita": None,
            "orbital_radius_au": None,
            "description": "",
        }
    ]

    companheiras = [
        classe for classe in CLASSES_DE_ESTRELA if classe["codigo"] in CLASSES_DE_COMPANHEIRA
    ]
    minimo, maximo = SEPARACAO_POR_ARRANJO.get(escolhido["codigo"], (40, 800))

    for indice in range(1, quantidade):
        # Distribuição logarítmica: separações pequenas são mais comuns que as
        # extremas dentro da mesma faixa.
        separacao = minimo * (maximo / minimo) ** rng.random()
        # Só a hierárquica pendura a companheira na primária; nos demais
        # arranjos as estrelas dividem o centro do sistema.
        orbita = 0 if escolhido["codigo"] == "hierarquica" else None
        estrelas.append(
            {
                "star_class": _sortear_por_peso(companheiras, rng)["codigo"],
                "ordem": indice,
                "orbita": orbita,
                "orbital_radius_au": round(separacao, 2),
                "description": _descricao_da_companheira(escolhido, separacao),
            }
        )

    return {"arranjo": escolhido["codigo"], "estrelas": estrelas}


def _descricao_da_companheira(arranjo, separacao):
    distancia = f"{separacao:.2f} UA" if separacao < 10 else f"{round(separacao)} UA"
    textos = {
        "binaria_estreita": f"Companheira próxima, a {distancia} da primária: as duas somam luz no céu dos mundos do par.",
        "binaria_ampla": f"Companheira distante, a {distancia} da primária, com o próprio cortejo de mundos.",
        "hierarquica": f"Companheira em órbita da primária, a {distancia}.",
        "trinaria": f"Terceira estrela do cortejo, a {distancia} da primária.",
    }
    return textos.get(arranjo["codigo"], f"Companheira a {distancia} da primária.")


def perfis_do_preset(preset):
    """Perfis de ocupação plausíveis para um preset (todos, quando não há)."""
    if not preset:
        return list(PERFIS)
    permitidos = set(preset.get("perfis") or ())
    escolhidos = [perfil for perfil in PERFIS if perfil["codigo"] in permitidos]
    return escolhidos or list(PERFIS)


def gerar_metricas(perfil, rng, enfases=None):
    """Métricas coerentes com o perfil de ocupação, com variação por eixo.

    `enfases` vem do preset e desloca cada eixo em relação ao patamar do perfil:
    um bastião militar sobe indústria e estabilidade e derruba qualidade de
    vida sem deixar de ser uma colônia.
    """
    if perfil["metricas"] is None:
        return {metrica: None for metrica in METRICAS}

    enfases = enfases or {}
    minimo, maximo = perfil["metricas"]
    centro = (minimo + maximo) / 2
    amplitude = (maximo - minimo) / 2
    valores = {}
    for metrica in METRICAS:
        bruto = rng.gauss(centro, amplitude * 0.55) + enfases.get(metrica, 0)
        valores[metrica] = int(max(0, min(100, round(bruto))))
    return valores


def gerar_populacao(perfil, rng):
    minimo, maximo = perfil["populacao"]
    if maximo == 0:
        return 0
    # Distribuição logarítmica: povoamento se concentra na base da faixa.
    expoente = rng.uniform(0, 1) ** 1.7
    return int(minimo + (maximo - minimo) * expoente)


def gerar_sistema(rng=None, com_nome=False, preset=None):
    """Proposta completa de atributos de um sistema, sem gravar nada.

    Com `preset` (militar, industrial, capital...), a proposta sai coerente com
    a vocação escolhida: os perfis de ocupação implausíveis saem do sorteio e as
    métricas ganham a ênfase do preset.
    """
    rng = rng or random.Random()
    dados_do_preset = por_codigo(PRESETS_DE_SISTEMA, preset) if preset else None
    perfil = _sortear_por_peso(perfis_do_preset(dados_do_preset), rng)
    estrelas = gerar_estrelas(rng)
    arranjo = por_codigo(ARRANJOS_ESTELARES, estrelas["arranjo"])

    proposta = {
        "preset": dados_do_preset["codigo"] if dados_do_preset else "",
        "preset_nome": dados_do_preset["nome"] if dados_do_preset else "",
        "perfil": perfil["codigo"],
        "perfil_nome": perfil["nome"],
        "population": gerar_populacao(perfil, rng),
        "is_classified": 1 if rng.random() < 0.05 else 0,
        "arranjo": estrelas["arranjo"],
        "arranjo_nome": arranjo["nome"] if arranjo else "",
        "stars": estrelas["estrelas"],
        **gerar_metricas(
            perfil, rng, dados_do_preset["enfases"] if dados_do_preset else None
        ),
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


def hospedeiras(estrelas, arranjo=None):
    """Índices das estrelas que podem ter mundos próprios.

    Numa binária estreita os planetas são circumbinários: giram em volta das
    duas estrelas, e no modelo ficam pendurados na primária — que é onde o par
    tem massa. No arranjo hierárquico, as companheiras orbitam a primária longe
    demais para formar mundos estáveis, então também é ela quem hospeda.
    """
    raizes = [
        indice for indice, estrela in enumerate(estrelas) if estrela.get("orbita") is None
    ]
    if not raizes:
        return []
    if arranjo in ("binaria_estreita", "hierarquica"):
        return raizes[:1]
    return raizes


def gerar_corpos(estrelas, nome_do_sistema, rng=None, populado=False, arranjo=None):
    """Corpos em órbita, distribuídos entre as estrelas do sistema.

    Devolve uma lista plana onde cada item traz `filhos` (luas) e `estrela` — o
    índice, dentro de `estrelas`, da estrela que ele orbita. Nenhum corpo fica
    solto no centro do sistema: lá só cabem as estrelas.

    Numa binária ampla ou numa trinária, cada estrela forma o próprio cortejo,
    com a zona habitável calculada a partir da classe espectral dela.
    """
    rng = rng or random.Random()
    if not estrelas:
        return []

    indices = hospedeiras(estrelas, arranjo)
    if not indices:
        return []

    circumbinario = arranjo == "binaria_estreita" and len(estrelas) > 1
    corpos = []

    for indice_da_estrela in indices:
        estrela = estrelas[indice_da_estrela]
        parametros = PARAMETROS_DE_FORMACAO.get(
            estrela.get("star_class", "G"), PADRAO_DE_FORMACAO
        )
        if circumbinario:
            parametros = _afastar(parametros, FATOR_CIRCUMBINARIO)

        base = _nome_base(estrelas, indice_da_estrela, nome_do_sistema, circumbinario)
        for corpo in _corpos_de_uma_estrela(
            parametros, base, rng, dividido=len(indices) > 1, circumbinario=circumbinario
        ):
            corpo["estrela"] = indice_da_estrela
            corpos.append(corpo)

    if populado:
        _marcar_colonizados(corpos, rng)
    return corpos


def _afastar(parametros, fator):
    """Empurra zona habitável e linha de gelo para fora (luz somada do par)."""
    interna, externa = parametros["zona"]
    return {
        "zona": (interna * fator, externa * fator),
        "gelo": parametros["gelo"] * fator,
        "corpos": parametros["corpos"],
    }


def _nome_base(estrelas, indice, nome_do_sistema, circumbinario):
    """Prefixo dos mundos de uma estrela.

    Com uma hospedeira só — ou com planetas circumbinários, que pertencem ao par
    inteiro —, os mundos levam o nome do sistema. Com várias, levam o nome da
    estrela ("Kepler B I" orbita "Kepler B").
    """
    if circumbinario or len(estrelas) == 1:
        return nome_do_sistema
    estrela = estrelas[indice]
    return estrela.get("name") or f"{nome_do_sistema} {chr(65 + indice)}"


def _corpos_de_uma_estrela(parametros, base, rng, dividido=False, circumbinario=False):
    """Cortejo de uma estrela, em órbitas crescentes."""
    minimo, maximo = parametros["corpos"]
    quantidade = rng.randint(minimo, maximo)
    # Repartir os mundos entre várias estrelas, e não multiplicá-los: um
    # trinário não deve sair com o triplo de planetas de um sistema simples.
    if dividido:
        quantidade = round(quantidade * 0.6)
    if quantidade <= 0:
        return []

    # Órbitas crescentes, com espaçamento multiplicativo (lei de Titius-Bode em
    # espírito): cada corpo fica bem mais longe que o anterior.
    raio = parametros["zona"][0] * rng.uniform(0.25, 0.6)
    corpos = []
    indice_cinturao = rng.randint(1, max(1, quantidade - 1)) if rng.random() < 0.45 else None

    for indice in range(quantidade):
        zona = _zona_do_raio(raio, parametros)
        ordem = indice + 1
        algarismo = ROMANOS[min(indice, len(ROMANOS) - 1)]

        if indice == indice_cinturao:
            corpos.append(
                {
                    "name": f"Cinturão de {base}",
                    "body_type": "belt",
                    "orbital_order": ordem,
                    "orbital_radius_au": round(raio, 3),
                    "description": "Faixa de asteroides e detritos",
                    "tags": list(rng.sample(TAGS_DE_CINTURAO, rng.randint(1, 2))),
                    "filhos": [],
                }
            )
        else:
            tags = _tags(rng, zona)
            if circumbinario:
                tags.append(TAG_CIRCUMBINARIA)
            corpos.append(
                {
                    "name": f"{base} {algarismo}",
                    "body_type": "planet",
                    "orbital_order": ordem,
                    "orbital_radius_au": round(raio, 3),
                    "description": rng.choice(ZONAS[zona]["descricoes"]),
                    "tags": tags,
                    "filhos": _gerar_luas(rng, f"{base} {algarismo}", zona == "gelada"),
                }
            )

        raio *= rng.uniform(1.5, 2.4)

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
