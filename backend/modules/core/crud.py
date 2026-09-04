"""Fábrica de blueprints CRUD.

Um módulo de entidade simples se resume a: declarar a `Table`, escrever a
função de parsing do payload e chamar `build_crud_blueprint`. Módulos com
regras próprias (sistemas, rotas) usam as mesmas peças e acrescentam endpoints.
"""

from flask import Blueprint, jsonify, request

from ...db import get_db, row_to_dict, rows_to_dicts
from .validation import payload_of


def build_crud_blueprint(name, url_prefix, table, parse, serialize=None, before_delete=None):
    """Cria um blueprint com listar / obter / criar / atualizar / excluir.

    parse(payload, partial) -> dict de colunas
    serialize(conn, row)    -> dict devolvido ao cliente (padrão: a linha crua)
    before_delete(conn, id) -> executado dentro da transação de exclusão
    """
    blueprint = Blueprint(name, __name__, url_prefix=url_prefix)
    to_json = serialize or (lambda _conn, row: row_to_dict(row))

    @blueprint.get("")
    def listar():
        conn = get_db()
        rows = table.list_all(conn)
        if serialize:
            return jsonify([to_json(conn, row) for row in rows])
        return jsonify(rows_to_dicts(rows))

    @blueprint.get("/<int:item_id>")
    def obter(item_id):
        conn = get_db()
        return jsonify(to_json(conn, table.get(conn, item_id)))

    @blueprint.post("")
    def criar():
        conn = get_db()
        values = parse(payload_of(request), partial=False)
        with conn:
            item_id = table.insert(conn, values)
        return jsonify(to_json(conn, table.get(conn, item_id))), 201

    @blueprint.patch("/<int:item_id>")
    def atualizar(item_id):
        conn = get_db()
        table.get(conn, item_id)
        values = parse(payload_of(request), partial=True)
        with conn:
            table.update(conn, item_id, values)
        return jsonify(to_json(conn, table.get(conn, item_id)))

    @blueprint.delete("/<int:item_id>")
    def excluir(item_id):
        conn = get_db()
        table.get(conn, item_id)
        with conn:
            if before_delete:
                before_delete(conn, item_id)
            table.delete(conn, item_id)
        return "", 204

    return blueprint
