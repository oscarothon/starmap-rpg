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
    ("name", v.text, {"max_length": 120}),
    ("short_name", v.text, {"default": "", "allow_empty": True, "max_length": 24}),
    ("color_hex", v.text, {"default": "#8899aa", "allow_empty": True, "max_length": 9}),
    ("flag_icon", v.text, {"default": "", "allow_empty": True, "max_length": 255}),
    ("description", v.text, {"default": "", "allow_empty": True}),
    ("sort_order", v.integer, {"default": 0}),
)

parse = v.make_parser(FIELDS)
