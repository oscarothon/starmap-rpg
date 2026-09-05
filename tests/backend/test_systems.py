"""Testes de sistemas estelares, corpos celestes e influências."""


def test_cria_sistema_com_detalhe_completo(api):
    resposta = api.criar_sistema(name="Sol", x=10, y=-20, lore_text="Berço da humanidade.")
    assert resposta.status_code == 201

    sistema = resposta.get_json()
    assert sistema["name"] == "Sol"
    assert (sistema["x"], sistema["y"]) == (10, -20)
    assert sistema["counts"] == {
        "bodies": 0,
        "stars": 0,
        "planets": 0,
        "satellites": 0,
        "stations": 0,
        "belts": 0,
        "colonized": 0,
        "lanes": 0,
    }
    assert sistema["bodies"] == []
    assert sistema["stars"] == []
    assert sistema["star_summary"] == "Sistema sem estrela registrada"
    assert sistema["influences"] == []


def test_nome_do_sistema_e_obrigatorio(client):
    resposta = client.post("/api/systems", json={"x": 1, "y": 2})
    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "name"


def test_regiao_inexistente_e_recusada(client):
    resposta = client.post("/api/systems", json={"name": "Sol", "region_id": 999})
    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "region_id"


def test_metrica_fora_da_faixa_e_recusada(client):
    resposta = client.post("/api/systems", json={"name": "Sol", "economy": 150})
    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "economy"


def test_busca_por_nome(client, api):
    api.criar_sistema(name="Alfa Centauri")
    api.criar_sistema(name="Sirius")

    resultado = client.get("/api/systems?busca=centa").get_json()
    assert [sistema["name"] for sistema in resultado] == ["Alfa Centauri"]


def test_atualiza_sistema_parcialmente(client, api):
    sistema_id = api.criar_sistema(name="Sol", lore_text="Original").get_json()["id"]

    resposta = client.patch(f"/api/systems/{sistema_id}", json={"lore_text": "Revisado"})
    assert resposta.status_code == 200

    sistema = resposta.get_json()
    assert sistema["lore_text"] == "Revisado"
    assert sistema["name"] == "Sol"


def test_mover_sistema_grava_nova_posicao(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]

    resposta = client.patch(f"/api/systems/{sistema_id}/position", json={"x": 42.5, "y": -7})
    assert resposta.status_code == 200
    assert resposta.get_json() == {"id": sistema_id, "x": 42.5, "y": -7}

    assert client.get(f"/api/systems/{sistema_id}").get_json()["x"] == 42.5


def test_sistema_inexistente_devolve_404(client):
    assert client.get("/api/systems/999").status_code == 404


def test_impacto_da_exclusao_lista_dependencias(client, api):
    sol = api.criar_sistema(name="Sol").get_json()["id"]
    centauri = api.criar_sistema(name="Alfa Centauri").get_json()["id"]
    api.criar_rota(sol, centauri)
    api.criar_corpo(sol, name="Terra")

    impacto = client.get(f"/api/systems/{sol}/impact").get_json()
    assert impacto == {"bodies": 1, "lanes": 1, "influences": 0}


def test_excluir_sistema_remove_corpos_e_rotas_em_cascata(client, api):
    sol = api.criar_sistema(name="Sol").get_json()["id"]
    centauri = api.criar_sistema(name="Alfa Centauri").get_json()["id"]
    rota_id = api.criar_rota(sol, centauri).get_json()["id"]
    api.criar_corpo(sol, name="Terra")

    assert client.delete(f"/api/systems/{sol}").status_code == 204
    assert client.get(f"/api/systems/{sol}").status_code == 404
    assert client.get(f"/api/lanes/{rota_id}").status_code == 404
    assert client.get(f"/api/systems/{centauri}").status_code == 200


# --- Corpos celestes --------------------------------------------------------


def test_cria_corpo_com_tags(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]

    resposta = api.criar_corpo(
        sistema_id,
        name="Terra",
        body_type="planet",
        orbital_order=3,
        is_colonized=True,
        tags=["Mundo Oceânico", "Habitável"],
    )
    assert resposta.status_code == 201

    corpo = resposta.get_json()
    assert corpo["name"] == "Terra"
    assert corpo["tags"] == ["Habitável", "Mundo Oceânico"]
    assert corpo["is_colonized"] == 1


def test_lua_orbita_planeta_do_mesmo_sistema(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]
    terra = api.criar_corpo(sistema_id, name="Terra").get_json()["id"]
    api.criar_corpo(sistema_id, name="Lua", body_type="moon", parent_body_id=terra)

    arvore = client.get(f"/api/systems/{sistema_id}/bodies").get_json()
    assert len(arvore) == 1
    assert [filho["name"] for filho in arvore[0]["children"]] == ["Lua"]


def test_lua_nao_pode_orbitar_corpo_de_outro_sistema(client, api):
    sol = api.criar_sistema(name="Sol").get_json()["id"]
    centauri = api.criar_sistema(name="Alfa Centauri").get_json()["id"]
    terra = api.criar_corpo(sol, name="Terra").get_json()["id"]

    resposta = api.criar_corpo(centauri, name="Lua", parent_body_id=terra)
    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "parent_body_id"


def test_tipo_de_corpo_invalido_e_recusado(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]
    resposta = api.criar_corpo(sistema_id, body_type="buraco-negro")
    assert resposta.status_code == 400


def test_contadores_do_sistema_refletem_os_corpos(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]
    terra = api.criar_corpo(sistema_id, name="Terra", is_colonized=True).get_json()["id"]
    api.criar_corpo(sistema_id, name="Lua", body_type="moon", parent_body_id=terra)
    api.criar_corpo(sistema_id, name="Órbita Alta", body_type="station")

    contagens = client.get(f"/api/systems/{sistema_id}").get_json()["counts"]
    assert contagens["bodies"] == 3
    assert contagens["planets"] == 1
    assert contagens["satellites"] == 1
    assert contagens["stations"] == 1
    assert contagens["colonized"] == 1


def test_excluir_planeta_remove_suas_luas(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]
    terra = api.criar_corpo(sistema_id, name="Terra").get_json()["id"]
    api.criar_corpo(sistema_id, name="Lua", body_type="moon", parent_body_id=terra)

    assert client.delete(f"/api/systems/{sistema_id}/bodies/{terra}").status_code == 204
    assert client.get(f"/api/systems/{sistema_id}/bodies").get_json() == []


def test_corpo_de_outro_sistema_devolve_404(client, api):
    sol = api.criar_sistema(name="Sol").get_json()["id"]
    centauri = api.criar_sistema(name="Alfa Centauri").get_json()["id"]
    terra = api.criar_corpo(sol, name="Terra").get_json()["id"]

    resposta = client.patch(f"/api/systems/{centauri}/bodies/{terra}", json={"name": "X"})
    assert resposta.status_code == 404


# --- Influência de facções --------------------------------------------------


def test_define_influencias_do_sistema(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]
    faccao_id = api.criar_faccao(name="Comintern").get_json()["id"]

    resposta = client.put(
        f"/api/systems/{sistema_id}/influences",
        json={
            "influences": [
                {
                    "faction_id": faccao_id,
                    "influence_value": 70,
                    "trend": "rising",
                    "qualitative_label": "Hegemônica, em alta",
                }
            ]
        },
    )
    assert resposta.status_code == 200

    influencias = resposta.get_json()
    assert influencias[0]["faction_name"] == "Comintern"
    assert influencias[0]["influence_value"] == 70
    assert influencias[0]["trend"] == "rising"


def test_influencia_substitui_o_conjunto_anterior(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]
    faccao_id = api.criar_faccao().get_json()["id"]

    client.put(
        f"/api/systems/{sistema_id}/influences",
        json={"influences": [{"faction_id": faccao_id, "influence_value": 40}]},
    )
    resposta = client.put(f"/api/systems/{sistema_id}/influences", json={"influences": []})

    assert resposta.get_json() == []


def test_influencia_de_faccao_inexistente_e_recusada(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]

    resposta = client.put(
        f"/api/systems/{sistema_id}/influences",
        json={"influences": [{"faction_id": 999, "influence_value": 10}]},
    )
    assert resposta.status_code == 400
