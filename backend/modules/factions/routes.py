"""Endpoints de facções."""

from flask import jsonify

from ...db import get_db
from ..core.crud import build_crud_blueprint
from .repository import FACTIONS, parse

blueprint = build_crud_blueprint(
    name="factions",
    url_prefix="/api/factions",
    table=FACTIONS,
    parse=parse,
)


@blueprint.get("/<int:faction_id>/impact")
def impacto(faction_id):
    """O que a exclusão afeta — alimenta o diálogo de confirmação."""
    conn = get_db()
    FACTIONS.get(conn, faction_id)
    return jsonify(
        {
            "systems": conn.execute(
                "SELECT COUNT(*) AS total FROM star_system WHERE sovereign_faction_id = ?",
                (faction_id,),
            ).fetchone()["total"],
            "influences": conn.execute(
                "SELECT COUNT(*) AS total FROM faction_influence WHERE faction_id = ?",
                (faction_id,),
            ).fetchone()["total"],
        }
    )
