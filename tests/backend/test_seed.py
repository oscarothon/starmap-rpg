"""Testes do cenário de exemplo — em especial a trava que protege dados próprios."""

import pytest

from backend.db import connect
from backend.seed import ConteudoProprioEncontrado, conteudo_proprio, semear


def test_semear_cria_o_cenario_completo(tmp_path):
    conn = connect(tmp_path / "seed.db")
    resumo = semear(conn)

    assert resumo["sistemas"] == 16
    assert conn.execute("SELECT COUNT(*) AS t FROM star_system").fetchone()["t"] == 16
    assert conn.execute("SELECT COUNT(*) AS t FROM lane").fetchone()["t"] == 19
    conn.close()


def test_cada_sistema_do_cenario_tem_pelo_menos_uma_estrela(tmp_path):
    conn = connect(tmp_path / "seed.db")
    semear(conn)

    sem_estrela = conn.execute(
        """
        SELECT s.name FROM star_system s
        WHERE NOT EXISTS (
            SELECT 1 FROM celestial_body b
             WHERE b.system_id = s.id AND b.body_type = 'star'
        )
        """
    ).fetchall()
    assert sem_estrela == []
    conn.close()


def test_alfa_centauri_e_trinaria_com_classes_distintas(tmp_path):
    conn = connect(tmp_path / "seed.db")
    semear(conn)

    estrelas = conn.execute(
        """
        SELECT b.name, b.star_class FROM celestial_body b
        JOIN star_system s ON s.id = b.system_id
        WHERE s.name = 'Alfa Centauri' AND b.body_type = 'star'
        ORDER BY b.orbital_order
        """
    ).fetchall()

    assert [linha["name"] for linha in estrelas] == [
        "Alfa Centauri A",
        "Alfa Centauri B",
        "Alfa Centauri C",
    ]
    assert [linha["star_class"] for linha in estrelas] == ["G", "K", "M"]
    conn.close()


def test_semear_de_novo_e_idempotente(tmp_path):
    caminho = tmp_path / "seed.db"
    conn = connect(caminho)
    semear(conn)
    semear(conn)

    assert conn.execute("SELECT COUNT(*) AS t FROM star_system").fetchone()["t"] == 16
    conn.close()


def test_conteudo_proprio_lista_o_que_nao_veio_do_cenario(tmp_path):
    conn = connect(tmp_path / "seed.db")
    semear(conn)
    conn.execute("INSERT INTO star_system (name) VALUES ('Meu Sistema')")
    conn.commit()

    assert conteudo_proprio(conn) == ["Meu Sistema"]
    conn.close()


def test_semear_recusa_apagar_sistema_criado_pelo_mestre(tmp_path):
    conn = connect(tmp_path / "seed.db")
    semear(conn)
    conn.execute("INSERT INTO star_system (name) VALUES ('Meu Sistema')")
    conn.commit()

    with pytest.raises(ConteudoProprioEncontrado, match="Meu Sistema"):
        semear(conn)

    # nada foi apagado
    assert conn.execute(
        "SELECT COUNT(*) AS t FROM star_system WHERE name = 'Meu Sistema'"
    ).fetchone()["t"] == 1
    conn.close()


def test_forcar_permite_recriar_por_cima(tmp_path):
    conn = connect(tmp_path / "seed.db")
    semear(conn)
    conn.execute("INSERT INTO star_system (name) VALUES ('Meu Sistema')")
    conn.commit()

    semear(conn, forcar=True)

    assert conteudo_proprio(conn) == []
    conn.close()
