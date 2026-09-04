"""Endpoints de rotas entre sistemas."""

from flask import request

from ...db import get_db
from ..core import validation as v
from ..core.crud import build_crud_blueprint
from ..systems.repository import SYSTEMS
from .repository import LANES, existing_pair, parse


def _parse(payload, partial=False):
    conn = get_db()
    values = parse(payload, partial=partial)
    lane_id = (request.view_args or {}).get("item_id")

    current = LANES.find(conn, lane_id) if lane_id else None
    system_a = values.get("system_a_id", current["system_a_id"] if current else None)
    system_b = values.get("system_b_id", current["system_b_id"] if current else None)

    for field, system_id in (("system_a_id", system_a), ("system_b_id", system_b)):
        if system_id is None:
            raise v.ValidationError("Escolha os dois sistemas da rota.", field)
        if not SYSTEMS.exists(conn, system_id):
            raise v.ValidationError("O sistema informado não existe.", field)

    if system_a == system_b:
        raise v.ValidationError(
            "Uma rota precisa ligar dois sistemas diferentes.", "system_b_id"
        )
    if existing_pair(conn, system_a, system_b, ignore_id=lane_id):
        raise v.ValidationError(
            "Já existe uma rota entre esses dois sistemas.", "system_b_id"
        )
    return values


blueprint = build_crud_blueprint(
    name="lanes",
    url_prefix="/api/lanes",
    table=LANES,
    parse=_parse,
)
