"""Endpoint do catálogo: dropdowns e glossário bebem da mesma fonte."""

from flask import Blueprint, jsonify

from .dados import catalogo_completo

blueprint = Blueprint("catalog", __name__, url_prefix="/api/catalog")


@blueprint.get("")
def catalogo():
    return jsonify(catalogo_completo())
