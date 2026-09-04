"""Facções: nações, blocos e organizações que disputam influência."""

from ..core import validation as v
from ..core.repository import Table

FACTIONS = Table(
    name="faction",
    columns=(
        "name",
        "short_name",
        "color_hex",
        "flag_icon",
        "description",
        "sort_order",
    ),
    label="Facção",
    order_by="sort_order, name",
)

FIELDS = (
    ("name", v.text, {"max_length": v.TEXTO_CURTO}),
    ("short_name", v.text, {"default": "", "allow_empty": True, "max_length": 24}),
    ("color_hex", v.color, {"default": "#8899aa"}),
    ("flag_icon", v.safe_url, {"default": ""}),
    ("description", v.text, {"default": "", "allow_empty": True, "max_length": v.TEXTO_LONGO}),
    ("sort_order", v.integer, {"default": 0, "minimum": -9999, "maximum": 9999}),
)

parse = v.make_parser(FIELDS)
