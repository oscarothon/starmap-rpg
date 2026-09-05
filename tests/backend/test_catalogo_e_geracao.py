"""Testes do catálogo, da geração aleatória e das estrelas como corpos."""

import random

import pytest

from backend.modules.catalog.dados import (
    CLASSES_DE_ESTRELA,
    METRICAS,
    catalogo_completo,
    codigos,
    faixa_da_metrica,
    por_codigo,
)
from backend.modules.generator import gerador


# --- Catálogo ----------------------------------------------------------------


def test_catalogo_traz_tudo_que_a_interface_precisa(client):
    catalogo = client.get("/api/catalog").get_json()

    assert set(catalogo) == {
        "classes_de_estrela",
        "tipos_de_corpo",
        "metricas",
        "tipos_de_rota",
        "niveis_de_regiao",
        "tendencias",
        "faixas_de_populacao",
    }
    assert len(catalogo["classes_de_estrela"]) >= 10
    assert len(catalogo["metricas"]) == 6


def test_cada_classe_de_estrela_tem_o_conteudo_do_glossario():
    for classe in CLASSES_DE_ESTRELA:
        assert classe["nome"] and classe["resumo"] and classe["descricao"]
        assert classe["cor"].startswith("#")
        assert classe["temperatura"]


def test_cada_metrica_descreve_as_cinco_faixas():
    for metrica in catalogo_completo()["metricas"]:
        assert len(metrica["faixas"]) == 5
        assert [faixa["minimo"] for faixa in metrica["faixas"]] == [0, 21, 41, 61, 81]
        for faixa in metrica["faixas"]:
            assert faixa["nome"] and faixa["descricao"]


def test_faixa_da_metrica_classifica_o_valor():
    economia = por_codigo(METRICAS, "economy")

    assert faixa_da_metrica(economia, 5)["nome"] == "Crítico"
    assert faixa_da_metrica(economia, 50)["nome"] == "Mediano"
    assert faixa_da_metrica(economia, 100)["nome"] == "Excepcional"
    assert faixa_da_metrica(economia, None) is None


# --- Estrelas como corpos celestes -------------------------------------------


def test_sistema_novo_comeca_sem_estrela(api):
    sistema = api.criar_sistema(name="Vazio").get_json()
    assert sistema["stars"] == []
    assert sistema["star_summary"] == "Sistema sem estrela registrada"


def test_estrela_e_um_corpo_com_classe_espectral(client, api):
    sistema_id = api.criar_sistema(name="Sol").get_json()["id"]
    resposta = api.criar_corpo(sistema_id, name="Sol", body_type="star", star_class="G")

    assert resposta.status_code == 201

    detalhe = client.get(f"/api/systems/{sistema_id}").get_json()
    assert detalhe["counts"]["stars"] == 1
    assert detalhe["counts"]["bodies"] == 0  # estrela não conta como corpo em órbita
    assert detalhe["stars"][0]["class_name"] == "Amarela (Tipo G)"
    assert detalhe["stars"][0]["class_color"].startswith("#")
    assert detalhe["star_summary"] == "Sistema estelar único — Amarela (Tipo G)"


def test_sistema_trinario_descreve_as_tres_estrelas(client, api):
    sistema_id = api.criar_sistema(name="Alfa").get_json()["id"]
    for indice, classe in enumerate(("G", "K", "M")):
        api.criar_corpo(sistema_id, name=f"Alfa {chr(65 + indice)}", body_type="star", star_class=classe, orbital_order=indice)

    detalhe = client.get(f"/api/systems/{sistema_id}").get_json()

    assert detalhe["counts"]["stars"] == 3
    assert detalhe["star_summary"].startswith("Sistema trinário —")
    assert "Anã vermelha (Tipo M)" in detalhe["star_summary"]


def test_classe_espectral_invalida_e_recusada(api):
    sistema_id = api.criar_sistema().get_json()["id"]
    resposta = api.criar_corpo(sistema_id, name="X", body_type="star", star_class="Z")

    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "star_class"


def test_planeta_pode_orbitar_uma_estrela(client, api):
    sistema_id = api.criar_sistema(name="Alfa").get_json()["id"]
    estrela = api.criar_corpo(sistema_id, name="Alfa A", body_type="star", star_class="G").get_json()
    api.criar_corpo(sistema_id, name="Alfa A I", parent_body_id=estrela["id"])

    arvore = client.get(f"/api/systems/{sistema_id}/bodies").get_json()
    estrela_na_arvore = next(corpo for corpo in arvore if corpo["body_type"] == "star")
    assert [filho["name"] for filho in estrela_na_arvore["children"]] == ["Alfa A I"]


def test_estrelas_vem_antes_dos_demais_corpos(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]
    api.criar_corpo(sistema_id, name="Planeta", orbital_order=1)
    api.criar_corpo(sistema_id, name="Estrela", body_type="star", star_class="M", orbital_order=9)

    arvore = client.get(f"/api/systems/{sistema_id}/bodies").get_json()
    assert arvore[0]["name"] == "Estrela"


def test_mapa_conta_estrelas_a_partir_dos_corpos(client, api):
    sistema_id = api.criar_sistema(name="Binario").get_json()["id"]
    api.criar_corpo(sistema_id, name="A", body_type="star", star_class="G")
    api.criar_corpo(sistema_id, name="B", body_type="star", star_class="M")

    sistema = client.get("/api/map").get_json()["systems"][0]
    assert sistema["star_count"] == 2
    assert sistema["body_count"] == 0


# --- Geração aleatória: funções puras ----------------------------------------


def test_geracao_e_reproduzivel_com_a_mesma_semente():
    primeira = gerador.gerar_sistema(random.Random(42))
    segunda = gerador.gerar_sistema(random.Random(42))
    assert primeira == segunda


def test_sistema_gerado_tem_metricas_coerentes_com_a_populacao():
    for semente in range(40):
        proposta = gerador.gerar_sistema(random.Random(semente))
        if proposta["population"] == 0:
            assert proposta["economy"] is None, "sistema desabitado não tem métricas"
        else:
            assert 0 <= proposta["economy"] <= 100


def test_estrelas_geradas_usam_classes_do_catalogo():
    validas = set(codigos(CLASSES_DE_ESTRELA))
    for semente in range(30):
        for estrela in gerador.gerar_estrelas(random.Random(semente)):
            assert estrela["star_class"] in validas


def test_quantidade_de_estrelas_pode_ser_imposta():
    estrelas = gerador.gerar_estrelas(random.Random(1), quantidade=3)
    assert len(estrelas) == 3


def test_corpos_gerados_ficam_em_orbitas_crescentes():
    estrelas = [{"star_class": "G"}]
    corpos = gerador.gerar_corpos(estrelas, "Teste", random.Random(7))

    raios = [corpo["orbital_radius_au"] for corpo in corpos if corpo["orbital_radius_au"]]
    assert raios == sorted(raios)


def test_corpos_gerados_respeitam_os_tipos_conhecidos():
    corpos = gerador.gerar_corpos([{"star_class": "K"}], "Teste", random.Random(3))
    for corpo in corpos:
        assert corpo["body_type"] in ("planet", "belt")
        for lua in corpo["filhos"]:
            assert lua["body_type"] == "moon"


def test_sistema_sem_estrela_nao_gera_corpos():
    assert gerador.gerar_corpos([], "Teste", random.Random(1)) == []


def test_sistema_populado_marca_algum_corpo_como_colonizado():
    corpos = gerador.gerar_corpos([{"star_class": "G"}], "Teste", random.Random(5), populado=True)
    todos = corpos + [lua for corpo in corpos for lua in corpo["filhos"]]
    assert any(corpo.get("is_colonized") for corpo in todos)


def test_nome_gerado_nao_e_vazio():
    assert len(gerador.gerar_nome(random.Random(9))) >= 4


# --- Geração aleatória: endpoints --------------------------------------------


def test_proposta_de_sistema_nao_grava_nada(client):
    proposta = client.get("/api/generation/system").get_json()

    assert "population" in proposta and "stars" in proposta
    assert client.get("/api/systems").get_json() == []


def test_proposta_pode_incluir_um_nome(client):
    assert "name" not in client.get("/api/generation/system").get_json()
    assert client.get("/api/generation/system?nome=1").get_json()["name"]


def test_geracao_cria_estrelas_e_corpos_do_sistema(client, api):
    sistema_id = api.criar_sistema(name="Kepler", population=5_000_000).get_json()["id"]

    resposta = client.post(f"/api/generation/systems/{sistema_id}", json={})
    assert resposta.status_code == 200

    detalhe = resposta.get_json()
    assert detalhe["counts"]["stars"] >= 1
    assert detalhe["gerados"] >= 0
    assert detalhe["star_summary"].startswith("Sistema")


def test_geracao_respeita_a_quantidade_de_estrelas_pedida(client, api):
    sistema_id = api.criar_sistema(name="Kepler").get_json()["id"]

    detalhe = client.post(
        f"/api/generation/systems/{sistema_id}", json={"estrelas": 3}
    ).get_json()

    assert detalhe["counts"]["stars"] == 3
    assert [estrela["name"] for estrela in detalhe["stars"]] == [
        "Kepler A",
        "Kepler B",
        "Kepler C",
    ]


def test_geracao_preserva_as_estrelas_existentes(client, api):
    sistema_id = api.criar_sistema(name="Kepler").get_json()["id"]
    api.criar_corpo(sistema_id, name="Kepler", body_type="star", star_class="M")

    detalhe = client.post(f"/api/generation/systems/{sistema_id}", json={}).get_json()

    assert detalhe["counts"]["stars"] == 1
    assert detalhe["stars"][0]["star_class"] == "M"


def test_substituir_troca_os_corpos_mas_mantem_as_estrelas(client, api):
    sistema_id = api.criar_sistema(name="Kepler").get_json()["id"]
    api.criar_corpo(sistema_id, name="Kepler", body_type="star", star_class="G")
    api.criar_corpo(sistema_id, name="Planeta antigo")

    detalhe = client.post(
        f"/api/generation/systems/{sistema_id}", json={"substituir": True}
    ).get_json()

    nomes = [corpo["name"] for corpo in detalhe["bodies"]]
    assert "Planeta antigo" not in nomes
    assert detalhe["counts"]["stars"] == 1


def test_geracao_em_sistema_inexistente_devolve_404(client):
    assert client.post("/api/generation/systems/999", json={}).status_code == 404


def test_quantidade_de_estrelas_fora_da_faixa_e_recusada(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]
    resposta = client.post(f"/api/generation/systems/{sistema_id}", json={"estrelas": 40})
    assert resposta.status_code == 400
