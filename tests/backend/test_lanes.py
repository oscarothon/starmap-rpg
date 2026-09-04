"""Testes das rotas entre sistemas."""

import pytest


@pytest.fixture
def dois_sistemas(api):
    sol = api.criar_sistema(name="Sol").get_json()["id"]
    centauri = api.criar_sistema(name="Alfa Centauri").get_json()["id"]
    return sol, centauri


def test_cria_rota_entre_dois_sistemas(api, dois_sistemas):
    sol, centauri = dois_sistemas

    resposta = api.criar_rota(sol, centauri, notes="Corredor principal")
    assert resposta.status_code == 201

    rota = resposta.get_json()
    assert rota["system_a_id"] == sol
    assert rota["system_b_id"] == centauri
    assert rota["lane_type"] == "cosmic_string"
    assert rota["bidirectional"] == 1


def test_rota_nao_pode_ligar_o_sistema_a_ele_mesmo(api, dois_sistemas):
    sol, _ = dois_sistemas
    resposta = api.criar_rota(sol, sol)
    assert resposta.status_code == 400


def test_rota_duplicada_e_recusada_em_qualquer_ordem(api, dois_sistemas):
    sol, centauri = dois_sistemas
    api.criar_rota(sol, centauri)

    resposta = api.criar_rota(centauri, sol)
    assert resposta.status_code == 400
    assert "já existe" in resposta.get_json()["erro"].lower()


def test_rota_com_sistema_inexistente_e_recusada(api, dois_sistemas):
    sol, _ = dois_sistemas
    resposta = api.criar_rota(sol, 999)
    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "system_b_id"


def test_tipo_de_rota_invalido_e_recusado(api, dois_sistemas):
    sol, centauri = dois_sistemas
    resposta = api.criar_rota(sol, centauri, lane_type="dobra-espacial")
    assert resposta.status_code == 400


def test_atualiza_e_exclui_rota(client, api, dois_sistemas):
    sol, centauri = dois_sistemas
    rota_id = api.criar_rota(sol, centauri).get_json()["id"]

    resposta = client.patch(f"/api/lanes/{rota_id}", json={"lane_type": "unstable"})
    assert resposta.status_code == 200
    assert resposta.get_json()["lane_type"] == "unstable"

    assert client.delete(f"/api/lanes/{rota_id}").status_code == 204
    assert client.get(f"/api/lanes/{rota_id}").status_code == 404
