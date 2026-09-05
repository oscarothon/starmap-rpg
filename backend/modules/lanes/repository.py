"""Rotas entre sistemas — as arestas do grafo do mapa."""

from ..catalog.dados import TIPOS_DE_ROTA, codigos
from ..core import validation as v
from ..core.repository import Table

LANE_TYPES = codigos(TIPOS_DE_ROTA)
TIPO_PADRAO = "hyperlane"

# `bidirectional` não entra nas colunas graváveis: rota liga os dois sistemas
# nos dois sentidos, sempre. A coluna sobrevive no banco como legado da
# migration 0001 (ver 0003_rotas_hyperlane.sql).
LANES = Table(
    name="lane",
    columns=("system_a_id", "system_b_id", "lane_type", "notes"),
    label="Rota",
    order_by="id",
    touch=False,
)

FIELDS = (
    ("system_a_id", v.reference, {}),
    ("system_b_id", v.reference, {}),
    ("lane_type", v.choice, {"options": LANE_TYPES, "default": TIPO_PADRAO}),
    ("notes", v.text, {"default": "", "allow_empty": True, "max_length": v.TEXTO_MEDIO}),
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
