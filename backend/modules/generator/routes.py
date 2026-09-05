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
from ..catalog.dados import PRESETS_DE_SISTEMA, codigos
from ..core import validation as v
from ..core.validation import payload_of
from ..systems import repository as sistemas
from . import gerador

blueprint = Blueprint("generator", __name__, url_prefix="/api/generation")

MAXIMO_DE_ESTRELAS = 4
PRESETS = codigos(PRESETS_DE_SISTEMA)


@blueprint.get("/system")
def propor_sistema():
    """Proposta de atributos para preencher o formulário de criação.

    `preset` enviesa a proposta para uma vocação (militar, industrial...); sem
    ele, o sorteio é livre.
    """
    com_nome = request.args.get("nome") in ("1", "true", "sim")
    preset = v.choice(
        {"preset": request.args.get("preset") or ""},
        "preset",
        options=(*PRESETS, ""),
        default="",
    )
    return jsonify(
        gerador.gerar_sistema(random.Random(), com_nome=com_nome, preset=preset or None)
    )


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
            proposta = gerador.gerar_estrelas(rng, quantidade_de_estrelas)
            arranjo = proposta["arranjo"]
            estrelas = _criar_estrelas(conn, system_id, sistema["name"], proposta["estrelas"])
        else:
            # Estrelas já cadastradas: o arranjo não foi registrado, então cada
            # estrela do centro é tratada como hospedeira dos próprios mundos.
            arranjo = None
            estrelas = [
                {
                    "id": estrela["id"],
                    "name": estrela["name"],
                    "star_class": estrela["star_class"],
                    "orbita": None if estrela["parent_body_id"] is None else 0,
                }
                for estrela in estrelas_existentes
            ]

        corpos = gerador.gerar_corpos(
            estrelas,
            sistema["name"],
            rng,
            populado=bool(sistema["population"]),
            arranjo=arranjo,
        )
        criados = _gravar_corpos(conn, system_id, estrelas, corpos)

    detalhe = sistemas.detail(conn, sistemas.SYSTEMS.get(conn, system_id))
    detalhe["gerados"] = criados
    return jsonify(detalhe)


def _criar_estrelas(conn, system_id, nome_do_sistema, propostas):
    """Grava as estrelas do arranjo e devolve a lista já com os ids.

    As estrelas do centro entram primeiro: no arranjo hierárquico a companheira
    é um corpo filho da primária, então precisa do id dela em mãos.
    """
    estrelas = [
        {
            **proposta,
            "id": None,
            "name": _nome_da_estrela(nome_do_sistema, indice, len(propostas)),
        }
        for indice, proposta in enumerate(propostas)
    ]

    for orbitando_outra in (False, True):
        for estrela in estrelas:
            if (estrela["orbita"] is not None) != orbitando_outra:
                continue
            estrela["id"] = sistemas.BODIES.insert(
                conn,
                {
                    "system_id": system_id,
                    "parent_body_id": (
                        estrelas[estrela["orbita"]]["id"]
                        if estrela["orbita"] is not None
                        else None
                    ),
                    "name": estrela["name"],
                    "body_type": "star",
                    "star_class": estrela["star_class"],
                    "orbital_order": estrela["ordem"],
                    "orbital_radius_au": estrela.get("orbital_radius_au"),
                    "description": estrela.get("description", ""),
                },
            )
    return estrelas


def _gravar_corpos(conn, system_id, estrelas, corpos):
    """Grava cada corpo pendurado na estrela que ele orbita."""
    total = 0
    for indice, estrela in enumerate(estrelas):
        do_grupo = [corpo for corpo in corpos if corpo.get("estrela") == indice]
        if not do_grupo:
            continue
        total += sistemas.insert_body_tree(
            conn, system_id, do_grupo, parent_body_id=estrela["id"]
        )
    return total


def _nome_da_estrela(nome_do_sistema, indice, total):
    """Convenção astronômica: Alfa Centauri A, B, C — sozinha, só o nome."""
    if total == 1:
        return nome_do_sistema
    return f"{nome_do_sistema} {chr(65 + indice)}"
