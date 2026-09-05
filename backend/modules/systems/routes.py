"""Endpoints de sistemas estelares e seus corpos celestes."""

from flask import Blueprint, jsonify, request

from ...db import get_db
from ..core import validation as v
from ..core.validation import NotFoundError, payload_of
from ..factions.repository import FACTIONS
from ..regions.repository import REGIONS
from . import repository as repo

blueprint = Blueprint("systems", __name__, url_prefix="/api/systems")


def _parse_system(payload, partial=False):
    values = repo.parse_system(payload, partial=partial)
    if values.get("region_id") is not None and not REGIONS.exists(get_db(), values["region_id"]):
        raise v.ValidationError("A região informada não existe.", "region_id")
    if values.get("sovereign_faction_id") is not None and not FACTIONS.exists(
        get_db(), values["sovereign_faction_id"]
    ):
        raise v.ValidationError(
            "A facção soberana informada não existe.", "sovereign_faction_id"
        )
    return values


# --- Sistemas ---------------------------------------------------------------


@blueprint.get("")
def listar():
    conn = get_db()
    # `instr` em vez de LIKE: o termo do usuário não vira padrão de busca, então
    # `%` e `_` digitados são texto comum, não curingas.
    search = (request.args.get("busca") or "").strip()[: v.TEXTO_CURTO]
    if search:
        rows = repo.SYSTEMS.list_all(
            conn, where="instr(lower(name), lower(?)) > 0", params=(search,)
        )
    else:
        rows = repo.SYSTEMS.list_all(conn)
    return jsonify([repo.summary(conn, row) for row in rows])


@blueprint.get("/<int:system_id>")
def obter(system_id):
    conn = get_db()
    return jsonify(repo.detail(conn, repo.SYSTEMS.get(conn, system_id)))


@blueprint.post("")
def criar():
    conn = get_db()
    values = _parse_system(payload_of(request), partial=False)
    with conn:
        system_id = repo.SYSTEMS.insert(conn, values)
    return jsonify(repo.detail(conn, repo.SYSTEMS.get(conn, system_id))), 201


@blueprint.patch("/<int:system_id>")
def atualizar(system_id):
    conn = get_db()
    repo.SYSTEMS.get(conn, system_id)
    values = _parse_system(payload_of(request), partial=True)
    with conn:
        repo.SYSTEMS.update(conn, system_id, values)
    return jsonify(repo.detail(conn, repo.SYSTEMS.get(conn, system_id)))


@blueprint.patch("/<int:system_id>/position")
def mover(system_id):
    """Endpoint leve usado ao arrastar o sistema no mapa."""
    conn = get_db()
    repo.SYSTEMS.get(conn, system_id)
    payload = payload_of(request)
    values = {"x": v.number(payload, "x"), "y": v.number(payload, "y")}
    with conn:
        repo.SYSTEMS.update(conn, system_id, values)
    row = repo.SYSTEMS.get(conn, system_id)
    return jsonify({"id": row["id"], "x": row["x"], "y": row["y"]})


@blueprint.get("/<int:system_id>/impact")
def impacto(system_id):
    """O que a exclusão levaria junto — alimenta o diálogo de confirmação."""
    conn = get_db()
    repo.SYSTEMS.get(conn, system_id)
    return jsonify(repo.deletion_impact(conn, system_id))


@blueprint.delete("/<int:system_id>")
def excluir(system_id):
    conn = get_db()
    repo.SYSTEMS.get(conn, system_id)
    with conn:
        repo.SYSTEMS.delete(conn, system_id)
    return "", 204


@blueprint.put("/<int:system_id>/influences")
def definir_influencias(system_id):
    conn = get_db()
    repo.SYSTEMS.get(conn, system_id)
    payload = payload_of(request)
    items = payload.get("influences", [])
    for item in items if isinstance(items, list) else []:
        faction_id = item.get("faction_id") if isinstance(item, dict) else None
        if faction_id is not None and not FACTIONS.exists(conn, faction_id):
            raise v.ValidationError("Uma das facções informadas não existe.", "influences")
    with conn:
        repo.replace_influences(conn, system_id, items)
    return jsonify(repo.influences_of(conn, system_id))


# --- Corpos celestes --------------------------------------------------------


@blueprint.get("/<int:system_id>/bodies")
def listar_corpos(system_id):
    conn = get_db()
    repo.SYSTEMS.get(conn, system_id)
    return jsonify(repo.bodies_of(conn, system_id))


@blueprint.post("/<int:system_id>/bodies")
def criar_corpo(system_id):
    conn = get_db()
    repo.SYSTEMS.get(conn, system_id)
    payload = payload_of(request)
    values = repo.parse_body(payload, partial=False)
    repo.validate_body_parent(conn, system_id, None, values.get("parent_body_id"))
    repo.validate_body_placement(
        conn, system_id, values.get("body_type", "planet"), values.get("parent_body_id")
    )
    values["system_id"] = system_id
    with conn:
        body_id = repo.BODIES.insert(conn, values)
        if "tags" in payload:
            repo.replace_tags(conn, body_id, _tags_of(payload))
    return jsonify(_body_payload(conn, system_id, body_id)), 201


@blueprint.patch("/<int:system_id>/bodies/<int:body_id>")
def atualizar_corpo(system_id, body_id):
    conn = get_db()
    atual = _get_body(conn, system_id, body_id)
    payload = payload_of(request)
    values = repo.parse_body(payload, partial=True)
    if "parent_body_id" in values:
        repo.validate_body_parent(conn, system_id, body_id, values["parent_body_id"])
    # Numa atualização parcial, o que não veio no payload continua valendo.
    repo.validate_body_placement(
        conn,
        system_id,
        values.get("body_type", atual["body_type"]),
        values["parent_body_id"] if "parent_body_id" in values else atual["parent_body_id"],
    )
    with conn:
        repo.BODIES.update(conn, body_id, values)
        if "tags" in payload:
            repo.replace_tags(conn, body_id, _tags_of(payload))
    return jsonify(_body_payload(conn, system_id, body_id))


@blueprint.delete("/<int:system_id>/bodies/<int:body_id>")
def excluir_corpo(system_id, body_id):
    conn = get_db()
    _get_body(conn, system_id, body_id)
    with conn:
        repo.BODIES.delete(conn, body_id)
    return "", 204


def _get_body(conn, system_id, body_id):
    row = repo.BODIES.find(conn, body_id)
    if row is None or row["system_id"] != system_id:
        raise NotFoundError("Corpo celeste não encontrado neste sistema.")
    return row


def _tags_of(payload):
    """Tags validadas: lista de textos curtos, sem repetição e com teto."""
    return v.tag_list(payload, "tags", default=[])


def _body_payload(conn, system_id, body_id):
    """Devolve o corpo recém-gravado já com tags, buscando na árvore do sistema."""
    def find(nodes):
        for node in nodes:
            if node["id"] == body_id:
                return node
            found = find(node["children"])
            if found:
                return found
        return None

    return find(repo.bodies_of(conn, system_id))
