"""Testes do runner de migrations."""

from backend.db import connect
from backend.migrate import apply_migrations, available_migrations


def test_migrations_criam_o_schema_do_zero(tmp_path):
    conn = connect(tmp_path / "novo.db")
    aplicadas = apply_migrations(conn)

    tabelas = {
        row["name"]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }

    assert "0001_init" in aplicadas
    assert {
        "region",
        "faction",
        "star_system",
        "celestial_body",
        "celestial_body_tag",
        "lane",
        "faction_influence",
        "schema_migrations",
    } <= tabelas
    conn.close()


def test_migrations_sao_idempotentes(tmp_path):
    caminho = tmp_path / "novo.db"
    conn = connect(caminho)
    apply_migrations(conn)
    conn.close()

    conn = connect(caminho)
    assert apply_migrations(conn) == []
    conn.close()


def test_migrations_sao_aplicadas_em_ordem_numerica():
    nomes = [caminho.name for caminho in available_migrations()]
    assert nomes == sorted(nomes)
