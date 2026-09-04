"""Endpoint agregador do mapa: tudo que o canvas precisa numa única resposta."""

from flask import Blueprint, jsonify

from ...db import get_db, rows_to_dicts
from ..factions.repository import FACTIONS
from ..lanes.repository import LANES
from ..regions.repository import REGIONS
from ..systems.repository import SYSTEMS

blueprint = Blueprint("map", __name__, url_prefix="/api/map")


@blueprint.get("")
def mapa():
    conn = get_db()

    systems = conn.execute(
        """
        SELECT s.id, s.name, s.x, s.y, s.star_type, s.star_count, s.region_id,
               s.sovereign_faction_id, s.population, s.is_classified,
               f.color_hex AS faction_color, f.short_name AS faction_short_name,
               f.name AS faction_name,
               (SELECT COUNT(*) FROM celestial_body b WHERE b.system_id = s.id) AS body_count
        FROM star_system s
        LEFT JOIN faction f ON f.id = s.sovereign_faction_id
        ORDER BY s.name
        """
    ).fetchall()

    return jsonify(
        {
            "systems": rows_to_dicts(systems),
            "lanes": rows_to_dicts(LANES.list_all(conn)),
            "regions": rows_to_dicts(REGIONS.list_all(conn)),
            "factions": rows_to_dicts(FACTIONS.list_all(conn)),
            "counts": {
                "systems": SYSTEMS.count(conn),
                "lanes": LANES.count(conn),
                "regions": REGIONS.count(conn),
                "factions": FACTIONS.count(conn),
            },
        }
    )
