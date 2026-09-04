"""Testes dos endpoints agregadores: mapa e índice de sistemas."""


def test_mapa_devolve_sistemas_rotas_regioes_e_faccoes(client, api):
    regiao_id = api.criar_regiao(name="Aglomerado Local").get_json()["id"]
    faccao_id = api.criar_faccao(name="Pacto de Roma", color_hex="#22cc55").get_json()["id"]
    sol = api.criar_sistema(
        name="Sol", region_id=regiao_id, sovereign_faction_id=faccao_id
    ).get_json()["id"]
    centauri = api.criar_sistema(name="Alfa Centauri").get_json()["id"]
    api.criar_rota(sol, centauri)

    mapa = client.get("/api/map").get_json()

    assert mapa["counts"] == {"systems": 2, "lanes": 1, "regions": 1, "factions": 1}
    assert {sistema["name"] for sistema in mapa["systems"]} == {"Sol", "Alfa Centauri"}

    sistema_sol = next(s for s in mapa["systems"] if s["name"] == "Sol")
    assert sistema_sol["faction_color"] == "#22cc55"
    assert sistema_sol["faction_name"] == "Pacto de Roma"
    assert mapa["lanes"][0]["system_a_id"] == sol


def test_mapa_vazio_nao_quebra(client):
    mapa = client.get("/api/map").get_json()
    assert mapa["systems"] == []
    assert mapa["counts"]["systems"] == 0


def test_indice_traz_metricas_e_contagens(client, api):
    superaglomerado = api.criar_regiao(
        name="Superaglomerado Local", level="supercluster"
    ).get_json()["id"]
    aglomerado = api.criar_regiao(
        name="Aglomerado Local", parent_id=superaglomerado
    ).get_json()["id"]
    sistema_id = api.criar_sistema(
        name="Sol", region_id=aglomerado, population=12000, economy=80
    ).get_json()["id"]
    api.criar_corpo(sistema_id, name="Terra")
    api.criar_corpo(sistema_id, name="Órbita Alta", body_type="station")

    indice = client.get("/api/index").get_json()
    linha = indice["systems"][0]

    assert linha["name"] == "Sol"
    assert linha["region_name"] == "Aglomerado Local"
    assert [passo["name"] for passo in linha["region_path"]] == [
        "Aglomerado Local",
        "Superaglomerado Local",
    ]
    assert linha["planets"] == 1
    assert linha["stations"] == 1
    assert linha["economy"] == 80
    assert linha["population"] == 12000


def test_indice_mostra_metrica_sem_dado_como_nulo(client, api):
    api.criar_sistema(name="Sol")
    linha = client.get("/api/index").get_json()["systems"][0]
    assert linha["stability"] is None
