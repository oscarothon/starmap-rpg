"""Fixtures compartilhadas dos testes de backend."""

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app import create_app  # noqa: E402
from backend.db import connect  # noqa: E402


@pytest.fixture
def db_path(tmp_path):
    return tmp_path / "starmap-test.db"


@pytest.fixture
def app(db_path):
    """App Flask isolado, com banco temporário já migrado."""
    return create_app({"TESTING": True, "DATABASE_PATH": str(db_path)})


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def conn(app):
    connection = connect(app.config["DATABASE_PATH"])
    yield connection
    connection.close()


@pytest.fixture
def api(client):
    """Atalhos para as chamadas de API mais usadas nos testes."""

    class Api:
        def criar_regiao(self, **kwargs):
            payload = {"name": "Aglomerado Local", **kwargs}
            return client.post("/api/regions", json=payload)

        def criar_faccao(self, **kwargs):
            payload = {"name": "República de Centauri", **kwargs}
            return client.post("/api/factions", json=payload)

        def criar_sistema(self, **kwargs):
            payload = {"name": "Sol", "x": 0, "y": 0, **kwargs}
            return client.post("/api/systems", json=payload)

        def criar_rota(self, system_a_id, system_b_id, **kwargs):
            payload = {
                "system_a_id": system_a_id,
                "system_b_id": system_b_id,
                **kwargs,
            }
            return client.post("/api/lanes", json=payload)

        def criar_corpo(self, system_id, **kwargs):
            payload = {"name": "Terra", **kwargs}
            return client.post(f"/api/systems/{system_id}/bodies", json=payload)

    return Api()
