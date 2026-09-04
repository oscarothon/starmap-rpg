"""Popula o banco com um cenário de exemplo (útil em desenvolvimento e nos E2E).

Uso:  python -m backend.seed [caminho_do_banco]
O banco é limpo antes de receber os dados.
"""

import sys

from .db import connect
from .migrate import apply_migrations

REGIOES = [
    # (chave, nome, nível, chave do pai)
    ("supercluster", "Superaglomerado Local", "supercluster", None),
    ("local", "Aglomerado Local", "cluster", "supercluster"),
    ("fronteira", "Fronteira de Órion", "cluster", "supercluster"),
    ("solar", "Subaglomerado Solar", "subcluster", "local"),
    ("draconis", "Subaglomerado de Dracão", "subcluster", "local"),
    ("veu", "Véu de Lyra", "subcluster", "fronteira"),
]

FACCOES = [
    ("autoridade", "Autoridade Solar Conjunta", "ASC", "#4aa3e0", "Bloco fundador, sediado em Sol."),
    ("republica", "República de Centauri", "RC", "#c9e64b", "Primeira colônia extrassolar independente."),
    ("consorcio", "Consórcio de Dracão", "CD", "#e8b13a", "Aliança de corporações mineradoras."),
    ("comuna", "Comuna das Estrelas Livres", "CEL", "#e0574a", "Federação de mundos operários."),
    ("veu", "Companhia do Véu", "CV", "#a06fd0", "Frota mercante que domina a fronteira."),
]

SISTEMAS = [
    # (nome, x, y, região, facção, estrelas, tipo, população, lore)
    ("Sol", 0, 0, "solar", "autoridade", 1, "Anã amarela G2V", 14_000_000_000,
     "Berço da humanidade. Todas as rotas ainda começam aqui."),
    ("Alfa Centauri", 120, -40, "solar", "republica", 3, "Sistema trinário G2V/K1V/M5V", 9_400_000_000,
     "A primeira colônia extrassolar. O centro da civilização para onde tudo converge."),
    ("Sirius", -95, -110, "solar", "autoridade", 2, "Anã branca A1V", 2_100_000_000,
     "Estaleiros orbitais e a maior doca seca do Aglomerado Local."),
    ("Tau Ceti", 165, 90, "solar", "republica", 1, "Anã amarela G8V", 3_800_000_000,
     "Celeiro agrícola das colônias interiores."),
    ("Epsilon Eridani", 60, -130, "solar", "autoridade", 1, "Anã laranja K2V", 780_000_000,
     "Posto avançado de escuta da Autoridade Solar."),
    ("Wolf 359", -60, 30, "solar", None, 1, "Anã vermelha M6V", 12_000,
     "Pouco mais que uma estação de reabastecimento."),
    ("Procyon", -180, 60, "solar", "comuna", 2, "Subgigante F5IV", 1_500_000_000,
     "Onde a Comuna declarou a Primeira Carta das Estrelas Livres."),
    ("Barnard", 95, 45, "solar", None, 1, "Anã vermelha M4V", 340_000,
     "Refúgio de contrabandistas, oficialmente desabitado."),
    ("Delta Draconis", 40, 230, "draconis", "consorcio", 1, "Gigante G9III", 5_600_000_000,
     "Sede corporativa do Consórcio, construída dentro de um asteroide."),
    ("Sigma Draconis", 175, 260, "draconis", "consorcio", 1, "Anã amarela G9V", 2_200_000_000,
     "Refinarias em órbita cobrem o céu de todos os mundos internos."),
    ("Theta Draconis", 250, 195, "draconis", "consorcio", 2, "Binária F8V", 640_000_000,
     "Disputada entre o Consórcio e mineradoras independentes."),
    ("Orcus", -280, -30, "draconis", "comuna", 1, "Anã vermelha M2V", 89_000_000,
     "Colônia penal reconvertida em cooperativa mineradora."),
    ("Ismarus", -350, -95, "veu", "veu", 1, "Anã laranja K5V", 410_000_000,
     "Primeiro entreposto da Companhia do Véu."),
    ("Styx", -395, 40, "veu", "veu", 1, "Anã branca DA", 22_000_000,
     "O farol do Véu: sem ele, ninguém atravessa a fronteira."),
    ("Vega", 300, -140, "veu", None, 1, "Anã branca A0V", 0,
     "Sistema classificado. Nenhuma informação liberada."),
    ("Arcturus", 380, -20, "veu", "veu", 1, "Gigante vermelha K1III", 1_100_000_000,
     "Última parada antes do vazio interestelar."),
]

ROTAS = [
    ("Sol", "Alfa Centauri", "cosmic_string"),
    ("Sol", "Sirius", "cosmic_string"),
    ("Sol", "Wolf 359", "cosmic_string"),
    ("Sol", "Epsilon Eridani", "cosmic_string"),
    ("Alfa Centauri", "Tau Ceti", "trade_route"),
    ("Alfa Centauri", "Barnard", "cosmic_string"),
    ("Alfa Centauri", "Epsilon Eridani", "cosmic_string"),
    ("Wolf 359", "Procyon", "cosmic_string"),
    ("Procyon", "Orcus", "trade_route"),
    ("Orcus", "Ismarus", "unstable"),
    ("Ismarus", "Styx", "cosmic_string"),
    ("Tau Ceti", "Delta Draconis", "trade_route"),
    ("Delta Draconis", "Sigma Draconis", "cosmic_string"),
    ("Delta Draconis", "Theta Draconis", "cosmic_string"),
    ("Sigma Draconis", "Theta Draconis", "trade_route"),
    ("Theta Draconis", "Arcturus", "unstable"),
    ("Epsilon Eridani", "Vega", "restricted"),
    ("Vega", "Arcturus", "restricted"),
    ("Barnard", "Tau Ceti", "cosmic_string"),
]

CORPOS_DE_SOL = [
    # (nome, tipo, ordem, colonizado, tags, lua de)
    ("Mercúrio", "planet", 1, 0, ["Sem atmosfera", "Mundo escaldado"], None),
    ("Vênus", "planet", 2, 1, ["Efeito estufa", "Mundo velado"], None),
    ("Terra", "planet", 3, 1, ["Mundo oceânico", "Berço da humanidade"], None),
    ("Lua", "moon", 1, 1, ["Sem atmosfera", "Estaleiro orbital"], "Terra"),
    ("Marte", "planet", 4, 1, ["Mundo árido", "Terraformação parcial"], None),
    ("Fobos", "moon", 1, 1, ["Ancoradouro militar"], "Marte"),
    ("Cinturão Principal", "belt", 5, 1, ["Mineração pesada"], None),
    ("Júpiter", "planet", 6, 0, ["Gigante gasoso", "Cinturão de radiação"], None),
    ("Europa", "moon", 1, 1, ["Oceano subglacial", "Colônia científica"], "Júpiter"),
    ("Saturno", "planet", 7, 0, ["Gigante gasoso", "Sistema de anéis"], None),
]

INFLUENCIAS = {
    "Sol": [("autoridade", 82, "steady", "Hegemônica, estável"), ("republica", 12, "rising", "Marginal, em alta")],
    "Alfa Centauri": [
        ("republica", 64, "steady", "Dominante, estável"),
        ("autoridade", 22, "falling", "Notável, em queda"),
        ("consorcio", 9, "rising", "Marginal, em alta"),
    ],
    "Delta Draconis": [("consorcio", 88, "rising", "Hegemônica, em alta"), ("comuna", 6, "steady", "Mínima")],
    "Procyon": [("comuna", 71, "rising", "Dominante, em alta"), ("autoridade", 14, "falling", "Marginal")],
    "Ismarus": [("veu", 58, "steady", "Dominante, estável"), ("consorcio", 21, "rising", "Notável")],
}


def semear(conn):
    """Limpa e recria o cenário de exemplo."""
    apply_migrations(conn)

    with conn:
        for tabela in (
            "faction_influence",
            "celestial_body_tag",
            "celestial_body",
            "lane",
            "star_system",
            "faction",
            "region",
        ):
            conn.execute(f"DELETE FROM {tabela}")

        regioes = {}
        for chave, nome, nivel, pai in REGIOES:
            cursor = conn.execute(
                "INSERT INTO region (name, level, parent_id, sort_order) VALUES (?, ?, ?, ?)",
                (nome, nivel, regioes.get(pai), len(regioes)),
            )
            regioes[chave] = cursor.lastrowid

        faccoes = {}
        for indice, (chave, nome, sigla, cor, descricao) in enumerate(FACCOES):
            cursor = conn.execute(
                """
                INSERT INTO faction (name, short_name, color_hex, description, sort_order)
                VALUES (?, ?, ?, ?, ?)
                """,
                (nome, sigla, cor, descricao, indice),
            )
            faccoes[chave] = cursor.lastrowid

        sistemas = {}
        for nome, x, y, regiao, faccao, estrelas, tipo, populacao, lore in SISTEMAS:
            classificado = 1 if nome == "Vega" else 0
            cursor = conn.execute(
                """
                INSERT INTO star_system
                    (name, x, y, region_id, sovereign_faction_id, star_count, star_type,
                     population, lore_text, is_classified, economy, industry, innovation,
                     information, stability, quality_of_life)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    nome,
                    x,
                    y,
                    regioes[regiao],
                    faccoes.get(faccao),
                    estrelas,
                    tipo,
                    populacao,
                    lore,
                    classificado,
                    _metrica(nome, 3),
                    _metrica(nome, 5),
                    _metrica(nome, 7),
                    _metrica(nome, 11),
                    _metrica(nome, 13),
                    _metrica(nome, 17),
                ),
            )
            sistemas[nome] = cursor.lastrowid

        conn.execute(
            "UPDATE star_system SET notice_text = ? WHERE name = 'Sol'",
            ("Por ordem da Autoridade Solar Conjunta — trânsito não autorizado será interceptado.",),
        )

        for origem, destino, tipo in ROTAS:
            conn.execute(
                "INSERT INTO lane (system_a_id, system_b_id, lane_type) VALUES (?, ?, ?)",
                (sistemas[origem], sistemas[destino], tipo),
            )

        corpos = {}
        for nome, tipo, ordem, colonizado, tags, orbita in CORPOS_DE_SOL:
            cursor = conn.execute(
                """
                INSERT INTO celestial_body
                    (system_id, parent_body_id, name, body_type, orbital_order, is_colonized)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (sistemas["Sol"], corpos.get(orbita), nome, tipo, ordem, colonizado),
            )
            corpos[nome] = cursor.lastrowid
            for tag in tags:
                conn.execute(
                    "INSERT INTO celestial_body_tag (body_id, tag) VALUES (?, ?)",
                    (corpos[nome], tag),
                )

        for nome_sistema, itens in INFLUENCIAS.items():
            for chave_faccao, valor, tendencia, rotulo in itens:
                conn.execute(
                    """
                    INSERT INTO faction_influence
                        (system_id, faction_id, influence_value, trend, qualitative_label)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (sistemas[nome_sistema], faccoes[chave_faccao], valor, tendencia, rotulo),
                )

    return {"sistemas": len(SISTEMAS), "rotas": len(ROTAS), "faccoes": len(FACCOES)}


def _metrica(nome, fator):
    """Valor estável e variado por sistema, só para a demonstração ter dados."""
    return (sum(ord(letra) for letra in nome) * fator) % 101


def main(argv=None):
    argv = argv if argv is not None else sys.argv[1:]
    conn = connect(argv[0] if argv else None)
    try:
        resumo = semear(conn)
    finally:
        conn.close()
    print(
        f"Cenário de exemplo criado: {resumo['sistemas']} sistemas, "
        f"{resumo['rotas']} rotas, {resumo['faccoes']} facções."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
