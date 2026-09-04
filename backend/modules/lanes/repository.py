"""Rotas entre sistemas — as arestas do grafo do mapa."""

from ..core import validation as v
from ..core.repository import Table

LANE_TYPES = ("cosmic_string", "trade_route", "unstable", "restricted")

LANES = Table(
    name="lane",
    columns=("system_a_id", "system_b_id", "lane_type", "bidirectional", "notes"),
    label="Rota",
    order_by="id",
    touch=False,
)

FIELDS = (
    ("system_a_id", v.reference, {}),
    ("system_b_id", v.reference, {}),
    ("lane_type", v.choice, {"options": LANE_TYPES, "default": "cosmic_string"}),
    ("bidirectional", v.boolean, {"default": 1}),
    ("notes", v.text, {"default": "", "allow_empty": True}),
)

parse = v.make_parser(FIELDS)


def existing_pair(conn, system_a_id, system_b_id, ignore_id=None):
    """Rota já cadastrada entre os dois sistemas, em qualquer ordem."""
    # Os parênteses em volta do OR são obrigatórios: sem eles o filtro de
    # ignore_id valeria só para o segundo braço (AND liga mais forte que OR).
    sql = (
        "SELECT * FROM lane"
        " WHERE ((system_a_id = ? AND system_b_id = ?)"
        "     OR (system_a_id = ? AND system_b_id = ?))"
    )
    params = [system_a_id, system_b_id, system_b_id, system_a_id]
    if ignore_id is not None:
        sql += " AND id <> ?"
        params.append(ignore_id)
    return conn.execute(sql, tuple(params)).fetchone()


def lanes_of(conn, system_id):
    return conn.execute(
        "SELECT * FROM lane WHERE system_a_id = ? OR system_b_id = ?",
        (system_id, system_id),
    ).fetchall()
