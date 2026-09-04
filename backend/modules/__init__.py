"""Registro dos módulos de feature do backend.

Cada módulo vive em backend/modules/<nome>/ e expõe um `blueprint` em
routes.py. Para acrescentar um módulo novo (boletins, procurados, conflitos...)
basta criar a pasta e adicionar o nome em FEATURE_MODULES.
"""

import importlib

FEATURE_MODULES = (
    "regions",
    "factions",
    "systems",
    "lanes",
    "map",
    "index",
)


def iter_blueprints():
    """Devolve o blueprint de cada módulo registrado, na ordem declarada."""
    for name in FEATURE_MODULES:
        module = importlib.import_module(f"{__name__}.{name}.routes")
        yield module.blueprint
