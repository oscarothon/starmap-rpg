"""Testes das defesas de borda: segredos, cabeçalhos, erros, SQL e entradas."""

import pytest

from backend.config import caminho_do_banco, carregar_env, chave_secreta, flag
from backend.modules.core.repository import Table
from backend.modules.core.validation import ValidationError, color, safe_url, tag_list


# --- Configuração e segredos -------------------------------------------------


def test_secret_key_do_ambiente_e_respeitada(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "segredo-de-teste")
    assert chave_secreta() == "segredo-de-teste"


def test_producao_sem_secret_key_falha_na_subida(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.setenv("STARMAP_AMBIENTE", "producao")

    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        chave_secreta()


def test_desenvolvimento_sem_secret_key_gera_chave_efemera(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.setenv("STARMAP_AMBIENTE", "desenvolvimento")

    assert len(chave_secreta()) >= 32
    assert chave_secreta() != chave_secreta()  # nunca é um valor fixo no código


def test_banco_nao_pode_ficar_em_pasta_publica(monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", "static/starmap.db")

    with pytest.raises(RuntimeError, match="servido"):
        caminho_do_banco()


def test_env_local_nao_sobrescreve_o_ambiente_real(monkeypatch, tmp_path):
    arquivo = tmp_path / ".env"
    arquivo.write_text("SECRET_KEY=do-arquivo\nOUTRA=valor\n", encoding="utf-8")
    monkeypatch.setenv("SECRET_KEY", "do-ambiente")

    carregar_env(arquivo)

    assert chave_secreta() == "do-ambiente"


def test_flag_aceita_formas_comuns_de_verdadeiro(monkeypatch):
    for valor in ("1", "true", "sim", "on"):
        monkeypatch.setenv("STARMAP_TESTE_FLAG", valor)
        assert flag("STARMAP_TESTE_FLAG") is True

    monkeypatch.setenv("STARMAP_TESTE_FLAG", "0")
    assert flag("STARMAP_TESTE_FLAG") is False


# --- Cabeçalhos de segurança -------------------------------------------------


def test_respostas_trazem_cabecalhos_de_seguranca(client):
    resposta = client.get("/")

    assert resposta.headers["X-Content-Type-Options"] == "nosniff"
    assert resposta.headers["X-Frame-Options"] == "DENY"
    assert "frame-ancestors 'none'" in resposta.headers["Content-Security-Policy"]
    assert "script-src 'self'" in resposta.headers["Content-Security-Policy"]


def test_hsts_so_aparece_em_producao(client, db_path):
    assert "Strict-Transport-Security" not in client.get("/").headers

    from backend.app import create_app

    producao = create_app({"DATABASE_PATH": str(db_path), "EM_PRODUCAO": True})
    with producao.test_client() as cliente_producao:
        assert "Strict-Transport-Security" in cliente_producao.get("/").headers


# --- Tratamento de erro ------------------------------------------------------


def test_erro_inesperado_nao_vaza_stack_trace(app, client, monkeypatch):
    from backend.modules.systems import repository as repo

    def explodir(*_args, **_kwargs):
        raise RuntimeError("detalhe interno com caminho C:\\segredo\\app.py")

    monkeypatch.setattr(repo.SYSTEMS, "list_all", explodir)
    app.config["DEBUG"] = False

    resposta = client.get("/api/systems")

    assert resposta.status_code == 500
    corpo = resposta.get_data(as_text=True)
    assert "segredo" not in corpo
    assert "Traceback" not in corpo
    assert resposta.get_json() == {"erro": "Erro interno. A equipe foi notificada."}


def test_metodo_nao_permitido_responde_json(client):
    resposta = client.put("/api/systems")
    assert resposta.status_code == 405
    assert "erro" in resposta.get_json()


# --- Trava de somente leitura ------------------------------------------------


def test_modo_somente_leitura_bloqueia_escrita(db_path):
    from backend.app import create_app

    app = create_app({"DATABASE_PATH": str(db_path), "SOMENTE_LEITURA": True})
    client = app.test_client()

    assert client.get("/api/systems").status_code == 200

    resposta = client.post("/api/systems", json={"name": "Sol"})
    assert resposta.status_code == 403
    assert "somente leitura" in resposta.get_json()["erro"].lower()

    assert client.delete("/api/systems/1").status_code == 403


# --- Identificadores de SQL --------------------------------------------------


def test_tabela_recusa_nome_com_sql():
    with pytest.raises(ValueError, match="Identificador"):
        Table(name="star_system; DROP TABLE region", columns=("name",))


def test_tabela_recusa_coluna_invalida():
    with pytest.raises(ValueError, match="Identificador"):
        Table(name="star_system", columns=("name", "x) --"))


def test_ordenacao_so_aceita_colunas_declaradas():
    tabela = Table(name="star_system", columns=("name", "x"))

    assert tabela._validar_ordenacao("name DESC") == "name DESC"
    with pytest.raises(ValueError, match="Ordenação inválida"):
        tabela._validar_ordenacao("(SELECT 1)")
    with pytest.raises(ValueError, match="Ordenação inválida"):
        tabela._validar_ordenacao("senha")


def test_where_com_valor_concatenado_e_recusado(conn):
    tabela = Table(name="star_system", columns=("name",))

    with pytest.raises(ValueError, match="suspeito"):
        tabela.list_all(conn, where="name = 'Sol' OR 1=1")


def test_busca_trata_curingas_como_texto(client, api):
    api.criar_sistema(name="Sol")
    api.criar_sistema(name="Alfa Centauri")

    assert client.get("/api/systems?busca=%25").get_json() == []
    assert client.get("/api/systems?busca=_").get_json() == []
    assert len(client.get("/api/systems?busca=sol").get_json()) == 1


def test_tentativa_de_injecao_na_busca_nao_afeta_o_banco(client, api):
    api.criar_sistema(name="Sol")

    resposta = client.get("/api/systems?busca=%27%3B+DROP+TABLE+star_system%3B--")

    assert resposta.status_code == 200
    assert resposta.get_json() == []
    assert len(client.get("/api/systems").get_json()) == 1


# --- Validação de entrada ----------------------------------------------------


def test_cor_invalida_e_recusada(client):
    resposta = client.post(
        "/api/factions", json={"name": "Injetora", "color_hex": "red;background:url(x)"}
    )
    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "color_hex"


def test_cor_hexadecimal_valida_e_aceita():
    assert color({"color_hex": "#c9e64b"}, "color_hex") == "#c9e64b"
    assert color({"color_hex": "#fff"}, "color_hex") == "#fff"
    assert color({"color_hex": ""}, "color_hex") == ""


def test_bandeira_recusa_esquema_executavel():
    with pytest.raises(ValidationError):
        safe_url({"flag_icon": "javascript:alert(1)"}, "flag_icon")
    with pytest.raises(ValidationError):
        safe_url({"flag_icon": "  JavaScript:alert(1)"}, "flag_icon")

    assert safe_url({"flag_icon": "/static/img/bandeira.png"}, "flag_icon")


def test_texto_longo_demais_e_recusado(client, api):
    sistema_id = api.criar_sistema().get_json()["id"]

    resposta = client.patch(f"/api/systems/{sistema_id}", json={"lore_text": "x" * 5000})

    assert resposta.status_code == 400
    assert "máximo" in resposta.get_json()["erro"]


def test_tags_tem_teto_de_quantidade_e_tamanho():
    with pytest.raises(ValidationError, match="máximo"):
        tag_list({"tags": [f"tag {i}" for i in range(50)]}, "tags")

    with pytest.raises(ValidationError, match="máximo"):
        tag_list({"tags": ["x" * 200]}, "tags")

    assert tag_list({"tags": ["Gelado", " Gelado ", ""]}, "tags") == ["Gelado"]


def test_coordenada_absurda_e_recusada(client):
    resposta = client.post("/api/systems", json={"name": "Fuga", "x": 10**12})
    assert resposta.status_code == 400
    assert resposta.get_json()["campo"] == "x"


def test_payload_que_nao_e_objeto_json_e_recusado(client):
    resposta = client.post(
        "/api/systems", data="[1,2,3]", content_type="application/json"
    )
    assert resposta.status_code == 400
    assert "objeto JSON" in resposta.get_json()["erro"]


def test_mensagem_de_erro_usa_o_rotulo_da_interface(client):
    resposta = client.post("/api/systems", json={"name": ""})

    corpo = resposta.get_json()
    assert corpo["erro"] == "O campo Nome não pode ficar vazio."
    assert corpo["campo"] == "name"  # nome técnico segue no contrato da API
