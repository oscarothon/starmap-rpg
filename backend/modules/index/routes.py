"""Endpoint do Índice de Sistemas: uma linha por sistema, com métricas.

A ordenação e a filtragem finas acontecem no cliente (a tabela é pequena o
bastante para caber em memória); aqui só entregamos as linhas já agregadas.
"""

from flask import Blueprint, jsonify

from ...db import get_db, rows_to_dicts
from ..regions.repository import REGIONS, breadcrumb

blueprint = Blueprint("index", __name__, url_prefix="/api/index")


@blueprint.get("")
def indice():
    conn = get_db()
    rows = conn.execute(
        """
        SELECT s.id, s.name, s.region_id, s.population, s.star_count,
               s.is_classified, s.economy, s.industry, s.innovation,
               s.information, s.stability, s.quality_of_life,
               r.name AS region_name,
               f.id AS faction_id, f.name AS faction_name,
               f.short_name AS faction_short_name, f.color_hex AS faction_color,
               (SELECT COUNT(*) FROM celestial_body b
                 WHERE b.system_id = s.id AND b.body_type = 'planet')  AS planets,
               (SELECT COUNT(*) FROM celestial_body b
                 WHERE b.system_id = s.id AND b.body_type = 'moon')    AS satellites,
               (SELECT COUNT(*) FROM celestial_body b
                 WHERE b.system_id = s.id AND b.body_type = 'station') AS stations,
               (SELECT COUNT(*) FROM lane l
                 WHERE l.system_a_id = s.id OR l.system_b_id = s.id)   AS lanes
        FROM star_system s
        LEFT JOIN region  r ON r.id = s.region_id
        LEFT JOIN faction f ON f.id = s.sovereign_faction_id
        ORDER BY s.name
        """
    ).fetchall()

    paths = {}
    systems = []
    for data in rows_to_dicts(rows):
        region_id = data["region_id"]
        if region_id not in paths:
            paths[region_id] = breadcrumb(conn, region_id)
        data["region_path"] = paths[region_id]
        systems.append(data)

    return jsonify(
        {
            "systems": systems,
            "regions": rows_to_dicts(REGIONS.list_all(conn)),
        }
    )
