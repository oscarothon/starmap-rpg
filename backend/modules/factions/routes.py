"""Endpoints de facções."""

from ..core.crud import build_crud_blueprint
from .repository import FACTIONS, parse

blueprint = build_crud_blueprint(
    name="factions",
    url_prefix="/api/factions",
    table=FACTIONS,
    parse=parse,
)
