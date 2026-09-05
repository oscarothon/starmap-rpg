"""Endpoints de regiões."""

from flask import jsonify, request

from ...db import get_db, row_to_dict
from ..core.crud import build_crud_blueprint
from .repository import REGIONS, parse, validate_hierarchy


def _parse(payload, partial=False):
    """Parsing padrão + verificação de ciclo na hierarquia de regiões."""
    values = parse(payload, partial=partial)
    if "parent_id" in values:
        region_id = (request.view_args or {}).get("item_id")
        validate_hierarchy(get_db(), region_id, values["parent_id"])
    return values


blueprint = build_crud_blueprint(
    name="regions",
    url_prefix="/api/regions",
    table=REGIONS,
    parse=_parse,
)


@blueprint.get("/<int:region_id>/impact")
def impacto(region_id):
    """O que a exclusão afeta — alimenta o diálogo de confirmação."""
    conn = get_db()
    REGIONS.get(conn, region_id)
    return jsonify(
        {
            "systems": conn.execute(
                "SELECT COUNT(*) AS total FROM star_system WHERE region_id = ?", (region_id,)
            ).fetchone()["total"],
            "subregions": conn.execute(
                "SELECT COUNT(*) AS total FROM region WHERE parent_id = ?", (region_id,)
            ).fetchone()["total"],
        }
    )


@blueprint.get("/tree")
def arvore():
    """Regiões em árvore, para navegação e selects encadeados."""
    conn = get_db()
    nodes = {}
    roots = []
    for row in REGIONS.list_all(conn):
        nodes[row["id"]] = {**row_to_dict(row), "children": []}
    for node in nodes.values():
        parent = nodes.get(node["parent_id"])
        (parent["children"] if parent else roots).append(node)
    return jsonify(roots)
