"""Testes das regiões (hierarquia)."""


def test_cria_e_lista_regiao(client, api):
    resposta = api.criar_regiao(name="Superaglomerado Local", level="supercluster")
    assert resposta.status_code == 201
    assert resposta.get_json()["name"] == "Superaglomerado Local"

    listagem = client.get("/api/regions").get_json()
    assert [regiao["name"] for regiao in listagem] == ["Superaglomerado Local"]


def test_nome_e_obrigatorio(client):
    resposta = client.post("/api/regions", json={})
    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "name"


def test_nivel_invalido_e_recusado(client):
    resposta = client.post("/api/regions", json={"name": "X", "level": "galaxia"})
    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "level"


def test_regiao_nao_pode_ser_pai_de_si_mesma(client, api):
    regiao_id = api.criar_regiao().get_json()["id"]
    resposta = client.patch(f"/api/regions/{regiao_id}", json={"parent_id": regiao_id})
    assert resposta.status_code == 400


def test_ciclo_na_hierarquia_e_recusado(client, api):
    avo = api.criar_regiao(name="Avó").get_json()["id"]
    filho = api.criar_regiao(name="Filha", parent_id=avo).get_json()["id"]

    resposta = client.patch(f"/api/regions/{avo}", json={"parent_id": filho})
    assert resposta.status_code == 400


def test_arvore_aninha_regioes_filhas(client, api):
    raiz = api.criar_regiao(name="Superaglomerado", level="supercluster").get_json()["id"]
    api.criar_regiao(name="Aglomerado", parent_id=raiz)

    arvore = client.get("/api/regions/tree").get_json()
    assert len(arvore) == 1
    assert [filha["name"] for filha in arvore[0]["children"]] == ["Aglomerado"]


def test_excluir_regiao_desvincula_sistemas(client, api):
    regiao_id = api.criar_regiao().get_json()["id"]
    sistema_id = api.criar_sistema(region_id=regiao_id).get_json()["id"]

    assert client.delete(f"/api/regions/{regiao_id}").status_code == 204
    assert client.get(f"/api/systems/{sistema_id}").get_json()["region_id"] is None
