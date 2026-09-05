"""Endpoints de geração aleatória.

Duas operações distintas de propósito:

- `GET /api/generation/system` devolve uma **proposta** e não grava nada — quem
  decide é o usuário, no formulário.
- `POST /api/generation/systems/<id>` **grava**: cria as estrelas e os corpos do
  sistema informado.
"""

import random

from flask import Blueprint, jsonify, request

from ...db import get_db
from ..core import validation as v
from ..core.validation import payload_of
from ..systems import repository as sistemas
from . import gerador

blueprint = Blueprint("generator", __name__, url_prefix="/api/generation")

MAXIMO_DE_ESTRELAS = 4


@blueprint.get("/system")
def propor_sistema():
    """Proposta de atributos para preencher o formulário de criação."""
    com_nome = request.args.get("nome") in ("1", "true", "sim")
    return jsonify(gerador.gerar_sistema(random.Random(), com_nome=com_nome))


@blueprint.get("/name")
def propor_nome():
    return jsonify({"name": gerador.gerar_nome(random.Random())})


@blueprint.post("/systems/<int:system_id>")
def gerar_para_o_sistema(system_id):
    """Gera estrelas e corpos de um sistema já existente."""
    conn = get_db()
    sistema = sistemas.SYSTEMS.get(conn, system_id)

    payload = payload_of(request) if request.data else {}
    substituir = v.boolean(payload, "substituir", default=0)
    quantidade_de_estrelas = v.integer(
        payload, "estrelas", default=None, minimum=1, maximum=MAXIMO_DE_ESTRELAS
    )

    rng = random.Random()
    estrelas_existentes = sistemas.stars_of(conn, system_id)

    with conn:
        if substituir:
            sistemas.delete_bodies_of(conn, system_id, incluir_estrelas=bool(quantidade_de_estrelas))
            if quantidade_de_estrelas:
                estrelas_existentes = []

        # Sem estrela nenhuma não há como decidir zona habitável: cria antes.
        if not estrelas_existentes:
            propostas = gerador.gerar_estrelas(rng, quantidade_de_estrelas)
            estrelas = [
                {
                    "name": _nome_da_estrela(sistema["name"], indice, len(propostas)),
                    "body_type": "star",
                    "star_class": proposta["star_class"],
                    "orbital_order": indice,
                    "tags": [],
                    "filhos": [],
                }
                for indice, proposta in enumerate(propostas)
            ]
            sistemas.insert_body_tree(conn, system_id, estrelas)
            estrelas_existentes = sistemas.stars_of(conn, system_id)

        corpos = gerador.gerar_corpos(
            [{"star_class": estrela["star_class"]} for estrela in estrelas_existentes],
            sistema["name"],
            rng,
            populado=bool(sistema["population"]),
        )
        criados = sistemas.insert_body_tree(conn, system_id, corpos)

    detalhe = sistemas.detail(conn, sistemas.SYSTEMS.get(conn, system_id))
    detalhe["gerados"] = criados
    return jsonify(detalhe)


def _nome_da_estrela(nome_do_sistema, indice, total):
    """Convenção astronômica: Alfa Centauri A, B, C — sozinha, só o nome."""
    if total == 1:
        return nome_do_sistema
    return f"{nome_do_sistema} {chr(65 + indice)}"
