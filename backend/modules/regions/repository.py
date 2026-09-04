"""Regiões: hierarquia de superaglomerados, aglomerados e subaglomerados."""

from ..core import validation as v
from ..core.repository import Table

LEVELS = ("supercluster", "cluster", "subcluster", "local")

REGIONS = Table(
    name="region",
    columns=(
        "parent_id",
        "name",
        "level",
        "description",
        "color_hex",
        "sort_order",
    ),
    label="Região",
    order_by="sort_order, name",
)

FIELDS = (
    ("name", v.text, {"max_length": v.TEXTO_CURTO}),
    ("parent_id", v.reference, {"default": None}),
    ("level", v.choice, {"options": LEVELS, "default": "cluster"}),
    ("description", v.text, {"default": "", "allow_empty": True, "max_length": v.TEXTO_LONGO}),
    ("color_hex", v.color, {"default": ""}),
    ("sort_order", v.integer, {"default": 0, "minimum": -9999, "maximum": 9999}),
)

parse = v.make_parser(FIELDS)


def validate_hierarchy(conn, region_id, parent_id):
    """Impede que uma região seja pai de si mesma ou crie um ciclo."""
    if parent_id is None:
        return
    if region_id is not None and parent_id == region_id:
        raise v.ValidationError("Uma região não pode ser pai de si mesma.", "parent_id")
    if not REGIONS.exists(conn, parent_id):
        raise v.ValidationError("A região superior informada não existe.", "parent_id")

    seen = {region_id} if region_id is not None else set()
    current = parent_id
    while current is not None:
        if current in seen:
            raise v.ValidationError(
                "Essa hierarquia criaria um ciclo entre regiões.", "parent_id"
            )
        seen.add(current)
        row = REGIONS.find(conn, current)
        current = row["parent_id"] if row else None


def breadcrumb(conn, region_id):
    """Caminho da região até a raiz, do mais específico para o mais amplo."""
    trail = []
    current = region_id
    guard = 0
    while current is not None and guard < 32:
        row = REGIONS.find(conn, current)
        if row is None:
            break
        trail.append({"id": row["id"], "name": row["name"], "level": row["level"]})
        current = row["parent_id"]
        guard += 1
    return trail
