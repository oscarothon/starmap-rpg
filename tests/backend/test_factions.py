"""Testes das facções."""


def test_cria_e_lista_faccao(client, api):
    resposta = api.criar_faccao(name="Comintern", short_name="CI", color_hex="#e0574a")
    assert resposta.status_code == 201

    faccao = resposta.get_json()
    assert faccao["name"] == "Comintern"
    assert faccao["color_hex"] == "#e0574a"
    assert len(client.get("/api/factions").get_json()) == 1


def test_nome_e_obrigatorio(client):
    resposta = client.post("/api/factions", json={})
    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "name"


def test_atualiza_faccao_parcialmente(client, api):
    faccao_id = api.criar_faccao(name="Comintern").get_json()["id"]

    resposta = client.patch(f"/api/factions/{faccao_id}", json={"short_name": "CI"})

    assert resposta.status_code == 200
    assert resposta.get_json() == {**resposta.get_json(), "name": "Comintern", "short_name": "CI"}


def test_impacto_conta_sistemas_soberanos_e_influencias(client, api):
    faccao_id = api.criar_faccao().get_json()["id"]
    sistema_id = api.criar_sistema(sovereign_faction_id=faccao_id).get_json()["id"]
    client.put(
        f"/api/systems/{sistema_id}/influences",
        json={"influences": [{"faction_id": faccao_id, "influence_value": 50}]},
    )

    impacto = client.get(f"/api/factions/{faccao_id}/impact").get_json()
    assert impacto == {"systems": 1, "influences": 1}


def test_excluir_faccao_torna_o_sistema_independente(client, api):
    faccao_id = api.criar_faccao().get_json()["id"]
    sistema_id = api.criar_sistema(sovereign_faction_id=faccao_id).get_json()["id"]

    assert client.delete(f"/api/factions/{faccao_id}").status_code == 204

    sistema = client.get(f"/api/systems/{sistema_id}").get_json()
    assert sistema["sovereign_faction"] is None
    assert sistema["influences"] == []


def test_faccao_inexistente_devolve_404(client):
    assert client.get("/api/factions/999").status_code == 404
    assert client.get("/api/factions/999/impact").status_code == 404
