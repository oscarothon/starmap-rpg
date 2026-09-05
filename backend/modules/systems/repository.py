"""Sistemas estelares, corpos celestes e influência de facções."""

from ...db import row_to_dict
from ..catalog.dados import CLASSES_DE_ESTRELA, TIPOS_DE_CORPO, codigos, por_codigo
from ..core import validation as v
from ..core.repository import Table
from ..regions.repository import REGIONS, breadcrumb

BODY_TYPES = codigos(TIPOS_DE_CORPO)
STAR_CLASSES = codigos(CLASSES_DE_ESTRELA)
TRENDS = ("rising", "falling", "steady")
METRICS = ("economy", "industry", "innovation", "information", "stability", "quality_of_life")

SYSTEMS = Table(
    name="star_system",
    columns=(
        "name",
        "region_id",
        "x",
        "y",
        "lore_text",
        "notice_text",
        "sovereign_faction_id",
        "population",
        "is_classified",
        *METRICS,
    ),
    label="Sistema",
    order_by="name",
)

BODIES = Table(
    name="celestial_body",
    columns=(
        "system_id",
        "parent_body_id",
        "name",
        "body_type",
        "star_class",
        "orbital_order",
        "orbital_radius_au",
        "is_colonized",
        "description",
        "colony_notes",
    ),
    label="Corpo celeste",
    order_by="orbital_order, id",
)

# Limites de coordenada e população: o mapa é finito e a população é uma
# estimativa de ambientação — valores absurdos só servem para quebrar a tela.
LIMITE_COORDENADA = 1_000_000
LIMITE_POPULACAO = 10**15

SYSTEM_FIELDS = (
    ("name", v.text, {"max_length": v.TEXTO_CURTO}),
    ("region_id", v.reference, {"default": None}),
    ("x", v.number, {"default": 0, "minimum": -LIMITE_COORDENADA, "maximum": LIMITE_COORDENADA}),
    ("y", v.number, {"default": 0, "minimum": -LIMITE_COORDENADA, "maximum": LIMITE_COORDENADA}),
    ("lore_text", v.text, {"default": "", "allow_empty": True, "max_length": v.TEXTO_LONGO}),
    ("notice_text", v.text, {"default": "", "allow_empty": True, "max_length": v.TEXTO_MEDIO}),
    ("sovereign_faction_id", v.reference, {"default": None}),
    ("population", v.integer, {"default": 0, "minimum": 0, "maximum": LIMITE_POPULACAO}),
    ("is_classified", v.boolean, {"default": 0}),
    *[(metric, v.integer, {"default": None, "minimum": 0, "maximum": 100}) for metric in METRICS],
)

BODY_FIELDS = (
    ("name", v.text, {"max_length": v.TEXTO_CURTO}),
    ("body_type", v.choice, {"options": BODY_TYPES, "default": "planet"}),
    # Só faz sentido em body_type='star'; vazio nos demais.
    ("star_class", v.choice, {"options": (*STAR_CLASSES, ""), "default": ""}),
    ("parent_body_id", v.reference, {"default": None}),
    ("orbital_order", v.integer, {"default": 0, "minimum": -999, "maximum": 999}),
    ("orbital_radius_au", v.number, {"default": None, "minimum": 0, "maximum": 1_000_000}),
    ("is_colonized", v.boolean, {"default": 0}),
    ("description", v.text, {"default": "", "allow_empty": True, "max_length": v.TEXTO_LONGO}),
    ("colony_notes", v.text, {"default": "", "allow_empty": True, "max_length": v.TEXTO_MEDIO}),
)

parse_system = v.make_parser(SYSTEM_FIELDS)
parse_body = v.make_parser(BODY_FIELDS)


# --- Corpos celestes ---------------------------------------------------------


def tags_of(conn, body_ids):
    """Tags agrupadas por corpo celeste."""
    if not body_ids:
        return {}
    placeholders = ", ".join("?" for _ in body_ids)
    rows = conn.execute(
        f"SELECT body_id, tag FROM celestial_body_tag WHERE body_id IN ({placeholders})"
        " ORDER BY tag",
        tuple(body_ids),
    ).fetchall()
    grouped = {}
    for row in rows:
        grouped.setdefault(row["body_id"], []).append(row["tag"])
    return grouped


def insert_body_tree(conn, system_id, corpos, parent_body_id=None):
    """Grava uma árvore de corpos (com `tags` e `filhos`) e devolve quantos criou.

    Usado pela geração aleatória: recebe a proposta pronta e persiste de uma vez,
    mantendo a hierarquia entre planeta e luas.
    """
    total = 0
    for corpo in corpos:
        valores = {
            "system_id": system_id,
            "parent_body_id": parent_body_id,
            "name": corpo["name"],
            "body_type": corpo.get("body_type", "planet"),
            "star_class": corpo.get("star_class", ""),
            "orbital_order": corpo.get("orbital_order", 0),
            "orbital_radius_au": corpo.get("orbital_radius_au"),
            "is_colonized": corpo.get("is_colonized", 0),
            "description": corpo.get("description", ""),
            "colony_notes": corpo.get("colony_notes", ""),
        }
        body_id = BODIES.insert(conn, valores)
        total += 1

        if corpo.get("tags"):
            replace_tags(conn, body_id, corpo["tags"])
        if corpo.get("filhos"):
            total += insert_body_tree(conn, system_id, corpo["filhos"], body_id)
    return total


def delete_bodies_of(conn, system_id, incluir_estrelas=False):
    """Apaga os corpos do sistema. As tags somem por cascata do banco."""
    sql = "DELETE FROM celestial_body WHERE system_id = ?"
    if not incluir_estrelas:
        sql += " AND body_type <> 'star'"
    conn.execute(sql, (system_id,))


def replace_tags(conn, body_id, tags):
    conn.execute("DELETE FROM celestial_body_tag WHERE body_id = ?", (body_id,))
    for tag in dict.fromkeys(tag.strip() for tag in tags if tag and tag.strip()):
        conn.execute(
            "INSERT INTO celestial_body_tag (body_id, tag) VALUES (?, ?)",
            (body_id, tag),
        )


def bodies_of(conn, system_id):
    """Corpos do sistema em árvore, estrelas primeiro.

    Quem tem parent_body_id orbita aquele corpo; quem não tem orbita o centro
    do sistema. As luas aparecem aninhadas sob o planeta, e os planetas sob a
    estrela que orbitam.
    """
    rows = conn.execute(
        """
        SELECT * FROM celestial_body
        WHERE system_id = ?
        ORDER BY CASE WHEN body_type = 'star' THEN 0 ELSE 1 END, orbital_order, id
        """,
        (system_id,),
    ).fetchall()
    tags = tags_of(conn, [row["id"] for row in rows])

    nodes = {
        row["id"]: {**row_to_dict(row), "tags": tags.get(row["id"], []), "children": []}
        for row in rows
    }
    roots = []
    for node in nodes.values():
        parent = nodes.get(node["parent_body_id"])
        (parent["children"] if parent else roots).append(node)
    return roots


def body_counts(conn, system_id):
    """Contadores exibidos nas abas Visão Geral e Sistema.

    `bodies` não conta as estrelas: elas são o sistema, não um corpo em órbita.
    """
    row = conn.execute(
        """
        SELECT
            SUM(CASE WHEN body_type <> 'star'   THEN 1 ELSE 0 END)     AS bodies,
            SUM(CASE WHEN body_type = 'star'    THEN 1 ELSE 0 END)     AS stars,
            SUM(CASE WHEN body_type = 'planet'  THEN 1 ELSE 0 END)     AS planets,
            SUM(CASE WHEN body_type = 'moon'    THEN 1 ELSE 0 END)     AS satellites,
            SUM(CASE WHEN body_type = 'station' THEN 1 ELSE 0 END)     AS stations,
            SUM(CASE WHEN body_type = 'belt'    THEN 1 ELSE 0 END)     AS belts,
            SUM(CASE WHEN is_colonized = 1      THEN 1 ELSE 0 END)     AS colonized
        FROM celestial_body WHERE system_id = ?
        """,
        (system_id,),
    ).fetchone()
    counts = {
        key: (row[key] or 0)
        for key in ("bodies", "stars", "planets", "satellites", "stations", "belts", "colonized")
    }
    counts["lanes"] = conn.execute(
        "SELECT COUNT(*) AS total FROM lane WHERE system_a_id = ? OR system_b_id = ?",
        (system_id, system_id),
    ).fetchone()["total"]
    return counts


def has_star(conn, system_id):
    return (
        conn.execute(
            "SELECT 1 FROM celestial_body WHERE system_id = ? AND body_type = 'star' LIMIT 1",
            (system_id,),
        ).fetchone()
        is not None
    )


def validate_body_placement(conn, system_id, body_type, parent_body_id):
    """No centro do sistema só cabe estrela.

    Um planeta com `parent_body_id` vazio ficaria orbitando o baricentro, que é
    o lugar das estrelas — foi assim que apareceram mundos orbitando o nada.
    Enquanto o sistema não tem estrela nenhuma a regra não vale: não há a quem
    entregar o corpo, e o mestre pode cadastrar os planetas antes da estrela.
    """
    if body_type == "star" or parent_body_id is not None:
        return
    if not has_star(conn, system_id):
        return
    raise v.ValidationError(
        "No centro do sistema só ficam estrelas. Escolha o corpo que este orbita.",
        "parent_body_id",
    )


def validate_body_parent(conn, system_id, body_id, parent_body_id):
    """O corpo orbitado precisa ser do mesmo sistema, sem formar ciclo.

    Sem `parent_body_id`, o corpo orbita o centro do sistema — que é onde ficam
    as estrelas e, num sistema múltiplo, o baricentro delas.
    """
    if parent_body_id is None:
        return
    if body_id is not None and parent_body_id == body_id:
        raise v.ValidationError(
            "Um corpo não pode orbitar a si mesmo.", "parent_body_id"
        )
    parent = BODIES.find(conn, parent_body_id)
    if parent is None or parent["system_id"] != system_id:
        raise v.ValidationError(
            "O corpo escolhido como órbita não pertence a este sistema.",
            "parent_body_id",
        )

    seen = {body_id} if body_id is not None else set()
    current = parent_body_id
    guard = 0
    while current is not None and guard < 32:
        if current in seen:
            raise v.ValidationError(
                "Essa órbita criaria um ciclo entre corpos celestes.", "parent_body_id"
            )
        seen.add(current)
        row = BODIES.find(conn, current)
        current = row["parent_body_id"] if row else None
        guard += 1


# --- Influência de facções ---------------------------------------------------


def influences_of(conn, system_id):
    rows = conn.execute(
        """
        SELECT fi.faction_id, fi.influence_value, fi.trend, fi.qualitative_label,
               f.name AS faction_name, f.short_name, f.color_hex
        FROM faction_influence fi
        JOIN faction f ON f.id = fi.faction_id
        WHERE fi.system_id = ?
        ORDER BY fi.influence_value DESC, f.name
        """,
        (system_id,),
    ).fetchall()
    return [row_to_dict(row) for row in rows]


def replace_influences(conn, system_id, items):
    """Substitui todas as influências do sistema pelo conjunto informado."""
    if not isinstance(items, list):
        raise v.ValidationError("As influências devem ser uma lista.", "influences")

    parsed = []
    for item in items:
        if not isinstance(item, dict):
            raise v.ValidationError("Cada influência deve ser um objeto.", "influences")
        parsed.append(
            (
                v.reference(item, "faction_id"),
                v.integer(item, "influence_value", default=0, minimum=0, maximum=100),
                v.choice(item, "trend", options=TRENDS, default="steady"),
                v.text(item, "qualitative_label", default="", allow_empty=True, max_length=80),
            )
        )

    conn.execute("DELETE FROM faction_influence WHERE system_id = ?", (system_id,))
    for faction_id, value, trend, label in parsed:
        if faction_id is None:
            continue
        conn.execute(
            """
            INSERT INTO faction_influence
                (system_id, faction_id, influence_value, trend, qualitative_label)
            VALUES (?, ?, ?, ?, ?)
            """,
            (system_id, faction_id, value, trend, label),
        )


# --- Serialização ------------------------------------------------------------


def stars_of(conn, system_id):
    """Estrelas do sistema, já com nome e cor da classe espectral."""
    rows = conn.execute(
        """
        SELECT * FROM celestial_body
        WHERE system_id = ? AND body_type = 'star'
        ORDER BY orbital_order, id
        """,
        (system_id,),
    ).fetchall()

    estrelas = []
    for row in rows:
        classe = por_codigo(CLASSES_DE_ESTRELA, row["star_class"])
        estrelas.append(
            {
                **row_to_dict(row),
                "class_name": classe["nome"] if classe else "Classe desconhecida",
                "class_color": classe["cor"] if classe else "#cfd6d0",
                "class_summary": classe["resumo"] if classe else "",
            }
        )
    return estrelas


def describe_system(estrelas):
    """Frase de cabeçalho: 'Sistema binário — Amarela (G) e Anã vermelha (M)'."""
    quantidade = len(estrelas)
    nomes = {
        0: "Sistema sem estrela registrada",
        1: "Sistema estelar único",
        2: "Sistema binário",
        3: "Sistema trinário",
    }
    base = nomes.get(quantidade, f"Sistema com {quantidade} estrelas")
    if not estrelas:
        return base

    classes = [estrela["class_name"] for estrela in estrelas]
    if quantidade == 1:
        return f"{base} — {classes[0]}"
    return f"{base} — {', '.join(classes[:-1])} e {classes[-1]}"


def summary(conn, row):
    """Forma enxuta usada no mapa e nas listagens."""
    data = row_to_dict(row)
    data["region_name"] = _name_of(conn, REGIONS, row["region_id"])
    faction = _faction_of(conn, row["sovereign_faction_id"])
    data["sovereign_faction"] = faction
    return data


def detail(conn, row):
    """Forma completa usada no painel lateral do sistema."""
    system_id = row["id"]
    data = summary(conn, row)
    data["region_path"] = breadcrumb(conn, row["region_id"])
    data["counts"] = body_counts(conn, system_id)
    data["bodies"] = bodies_of(conn, system_id)
    data["stars"] = stars_of(conn, system_id)
    data["star_summary"] = describe_system(data["stars"])
    data["influences"] = influences_of(conn, system_id)
    return data


def deletion_impact(conn, system_id):
    """Resumo do que será removido junto — usado no diálogo de confirmação."""
    counts = body_counts(conn, system_id)
    return {
        "bodies": counts["bodies"],
        "lanes": counts["lanes"],
        "influences": len(influences_of(conn, system_id)),
    }


def _name_of(conn, table, row_id):
    if row_id is None:
        return None
    row = table.find(conn, row_id)
    return row["name"] if row else None


def _faction_of(conn, faction_id):
    if faction_id is None:
        return None
    row = conn.execute(
        "SELECT id, name, short_name, color_hex, flag_icon FROM faction WHERE id = ?",
        (faction_id,),
    ).fetchone()
    return row_to_dict(row)
