"""Testes do catálogo, da geração aleatória e das estrelas como corpos."""

import random

import pytest

from backend.modules.catalog.dados import (
    ARRANJOS_ESTELARES,
    CLASSES_DE_ESTRELA,
    METRICAS,
    PRESETS_DE_SISTEMA,
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
        "arranjos_estelares",
        "presets_de_sistema",
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
        for estrela in gerador.gerar_estrelas(random.Random(semente))["estrelas"]:
            assert estrela["star_class"] in validas


def test_quantidade_de_estrelas_pode_ser_imposta():
    proposta = gerador.gerar_estrelas(random.Random(1), quantidade=3)
    assert len(proposta["estrelas"]) == 3
    assert 3 in por_codigo(ARRANJOS_ESTELARES, proposta["arranjo"])["estrelas"]


def test_corpos_gerados_ficam_em_orbitas_crescentes():
    estrelas = [{"star_class": "G"}]
    corpos = gerador.gerar_corpos(estrelas, "Teste", random.Random(7))

    raios = [corpo["orbital_radius_au"] for corpo in corpos if corpo["orbital_radius_au"]]
    assert raios == sorted(raios)


# --- Arranjos de sistemas múltiplos ------------------------------------------


def test_cada_arranjo_declara_quantidades_e_peso():
    for arranjo in ARRANJOS_ESTELARES:
        assert arranjo["nome"] and arranjo["resumo"] and arranjo["descricao"]
        assert arranjo["estrelas"] and all(q >= 1 for q in arranjo["estrelas"])
        assert arranjo["peso"] > 0


def test_arranjo_sorteado_comporta_a_quantidade_pedida():
    for quantidade in (1, 2, 3, 4):
        for semente in range(12):
            arranjo = gerador.sortear_arranjo(random.Random(semente), quantidade)
            assert quantidade in arranjo["estrelas"]


def test_sistema_de_uma_estrela_so_sai_no_arranjo_unico():
    for semente in range(20):
        proposta = gerador.gerar_estrelas(random.Random(semente), quantidade=1)
        assert proposta["arranjo"] == "unica"
        assert proposta["estrelas"][0]["orbita"] is None


def test_arranjo_hierarquico_pendura_a_companheira_na_primaria():
    proposta = gerador.gerar_estrelas(random.Random(3), quantidade=2, arranjo="hierarquica")
    primaria, companheira = proposta["estrelas"]

    assert primaria["orbita"] is None
    assert companheira["orbita"] == 0
    assert companheira["orbital_radius_au"] > 0
    assert "primária" in companheira["description"]


def test_binaria_ampla_deixa_as_duas_estrelas_no_centro():
    proposta = gerador.gerar_estrelas(random.Random(4), quantidade=2, arranjo="binaria_ampla")
    assert [estrela["orbita"] for estrela in proposta["estrelas"]] == [None, None]


def test_binaria_ampla_da_mundos_as_duas_estrelas():
    estrelas = [
        {"star_class": "G", "orbita": None, "name": "Teste A"},
        {"star_class": "K", "orbita": None, "name": "Teste B"},
    ]
    assert gerador.hospedeiras(estrelas, "binaria_ampla") == [0, 1]


def test_binaria_estreita_concentra_os_mundos_na_primaria():
    estrelas = [{"star_class": "G", "orbita": None}, {"star_class": "M", "orbita": None}]
    corpos = gerador.gerar_corpos(estrelas, "Teste", random.Random(6), arranjo="binaria_estreita")

    assert gerador.hospedeiras(estrelas, "binaria_estreita") == [0]
    assert all(corpo["estrela"] == 0 for corpo in corpos)
    planetas = [corpo for corpo in corpos if corpo["body_type"] == "planet"]
    assert planetas, "a semente escolhida precisa render ao menos um planeta"
    assert all(gerador.TAG_CIRCUMBINARIA in corpo["tags"] for corpo in planetas)


def test_companheira_hierarquica_nao_recebe_mundos():
    estrelas = [{"star_class": "G", "orbita": None}, {"star_class": "M", "orbita": 0}]
    corpos = gerador.gerar_corpos(estrelas, "Teste", random.Random(2), arranjo="hierarquica")
    assert all(corpo["estrela"] == 0 for corpo in corpos)


def test_todo_corpo_gerado_aponta_para_uma_estrela():
    """Nenhum mundo pode sair da geração orbitando o centro do sistema."""
    estrelas = [
        {"star_class": "G", "orbita": None, "name": "Teste A"},
        {"star_class": "K", "orbita": None, "name": "Teste B"},
    ]
    for semente in range(25):
        corpos = gerador.gerar_corpos(
            estrelas, "Teste", random.Random(semente), arranjo="binaria_ampla"
        )
        for corpo in corpos:
            assert corpo["estrela"] in (0, 1)


def test_mundos_de_cada_estrela_levam_o_nome_dela():
    estrelas = [
        {"star_class": "G", "orbita": None, "name": "Teste A"},
        {"star_class": "G", "orbita": None, "name": "Teste B"},
    ]
    corpos = gerador.gerar_corpos(
        estrelas, "Teste", random.Random(11), arranjo="binaria_ampla"
    )
    for corpo in corpos:
        esperado = "Teste A" if corpo["estrela"] == 0 else "Teste B"
        assert esperado in corpo["name"]


# --- Presets de geração -------------------------------------------------------


def test_cada_preset_tem_texto_e_perfis_existentes():
    perfis_validos = {perfil["codigo"] for perfil in gerador.PERFIS}
    metricas_validas = set(gerador.METRICAS)

    for preset in PRESETS_DE_SISTEMA:
        assert preset["nome"] and preset["resumo"] and preset["descricao"]
        assert preset["perfis"], "um preset sem perfil não sorteia nada"
        assert set(preset["perfis"]) <= perfis_validos
        assert set(preset["enfases"]) <= metricas_validas
        assert all(-40 <= valor <= 40 for valor in preset["enfases"].values())


def test_preset_restringe_os_perfis_de_ocupacao():
    capital = por_codigo(PRESETS_DE_SISTEMA, "capital")
    assert [perfil["codigo"] for perfil in gerador.perfis_do_preset(capital)] == ["central"]
    # Sem preset, todos os perfis continuam valendo.
    assert len(gerador.perfis_do_preset(None)) == len(gerador.PERFIS)


def test_preset_militar_puxa_as_metricas_para_a_vocacao_dele():
    industria = []
    qualidade = []
    for semente in range(30):
        proposta = gerador.gerar_sistema(random.Random(semente), preset="militar")
        industria.append(proposta["industry"])
        qualidade.append(proposta["quality_of_life"])

    assert sum(industria) / len(industria) > sum(qualidade) / len(qualidade)
    assert proposta["preset"] == "militar"
    assert proposta["preset_nome"] == "Bastião militar"


def test_preset_de_capital_sempre_sai_populoso():
    for semente in range(15):
        proposta = gerador.gerar_sistema(random.Random(semente), preset="capital")
        assert proposta["population"] >= 3_000_000_000
        assert proposta["economy"] is not None


def test_preset_de_sistema_morto_sai_desabitado():
    for semente in range(10):
        proposta = gerador.gerar_sistema(random.Random(semente), preset="ruina")
        assert proposta["population"] == 0
        assert proposta["economy"] is None


def test_proposta_sem_preset_nao_inventa_vocacao():
    proposta = gerador.gerar_sistema(random.Random(1))
    assert proposta["preset"] == ""
    assert proposta["arranjo"] in codigos(ARRANJOS_ESTELARES)


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


def test_proposta_aceita_um_preset(client):
    proposta = client.get("/api/generation/system?preset=industrial").get_json()

    assert proposta["preset"] == "industrial"
    assert proposta["preset_nome"] == "Polo industrial"
    assert proposta["population"] > 0


def test_preset_desconhecido_e_recusado(client):
    resposta = client.get("/api/generation/system?preset=colonia-espacial")

    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "preset"


# --- Hierarquia dos corpos gerados -------------------------------------------


def _achatar(corpos):
    for corpo in corpos:
        yield corpo
        for filho in corpo.get("children") or []:
            yield filho


def test_geracao_nao_deixa_corpo_orbitando_o_centro_do_sistema(client, api):
    """Só estrela fica no centro: todo mundo gerado orbita alguma coisa."""
    for indice in range(8):
        sistema_id = api.criar_sistema(name=f"Kepler {indice}").get_json()["id"]
        detalhe = client.post(f"/api/generation/systems/{sistema_id}", json={}).get_json()

        for corpo in _achatar(detalhe["bodies"]):
            if corpo["body_type"] != "star":
                assert corpo["parent_body_id"] is not None, corpo["name"]


def test_geracao_distribui_os_corpos_entre_as_estrelas_existentes(client, api):
    sistema_id = api.criar_sistema(name="Kepler").get_json()["id"]
    primeira = api.criar_corpo(
        sistema_id, name="Kepler A", body_type="star", star_class="G"
    ).get_json()
    segunda = api.criar_corpo(
        sistema_id, name="Kepler B", body_type="star", star_class="K", orbital_order=1
    ).get_json()

    detalhe = client.post(f"/api/generation/systems/{sistema_id}", json={}).get_json()

    donos = {
        corpo["parent_body_id"]
        for corpo in _achatar(detalhe["bodies"])
        if corpo["body_type"] != "star"
    }
    assert donos <= {primeira["id"], segunda["id"]}
    assert donos, "a geração precisa ter criado algum corpo"


def test_corpo_no_centro_e_recusado_quando_o_sistema_tem_estrela(api):
    sistema_id = api.criar_sistema(name="Sol").get_json()["id"]
    api.criar_corpo(sistema_id, name="Sol", body_type="star", star_class="G")

    resposta = api.criar_corpo(sistema_id, name="Terra")

    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "parent_body_id"
    assert "centro do sistema" in resposta.get_json()["erro"]


def test_corpo_no_centro_e_aceito_enquanto_nao_ha_estrela(api):
    """O mestre pode cadastrar os planetas antes de decidir a estrela."""
    sistema_id = api.criar_sistema(name="Rascunho").get_json()["id"]
    assert api.criar_corpo(sistema_id, name="Planeta solto").status_code == 201


def test_mover_corpo_para_o_centro_e_recusado(client, api):
    sistema_id = api.criar_sistema(name="Sol").get_json()["id"]
    estrela = api.criar_corpo(
        sistema_id, name="Sol", body_type="star", star_class="G"
    ).get_json()
    terra = api.criar_corpo(sistema_id, name="Terra", parent_body_id=estrela["id"]).get_json()

    resposta = client.patch(
        f"/api/systems/{sistema_id}/bodies/{terra['id']}", json={"parent_body_id": None}
    )
    assert resposta.status_code == 400


def test_estrela_companheira_pode_orbitar_a_primaria(client, api):
    sistema_id = api.criar_sistema(name="Alfa").get_json()["id"]
    primaria = api.criar_corpo(
        sistema_id, name="Alfa A", body_type="star", star_class="G"
    ).get_json()

    resposta = api.criar_corpo(
        sistema_id,
        name="Alfa B",
        body_type="star",
        star_class="M",
        parent_body_id=primaria["id"],
    )

    assert resposta.status_code == 201
    assert client.get(f"/api/systems/{sistema_id}").get_json()["counts"]["stars"] == 2
