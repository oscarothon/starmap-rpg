"""Fábrica da aplicação Flask.

Responsabilidades: configurar o banco, aplicar migrations, registrar os
blueprints dos módulos de feature, aplicar as defesas de borda (cabeçalhos,
trava de escrita, tratamento de erro sem vazamento) e servir as páginas.
"""

import logging
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from . import db
from .config import construir_config
from .migrate import apply_migrations
from .modules import iter_blueprints
from .modules.core.validation import NotFoundError, ValidationError

REPO_ROOT = Path(__file__).resolve().parent.parent
METODOS_DE_ESCRITA = {"POST", "PUT", "PATCH", "DELETE"}

logger = logging.getLogger(__name__)


def create_app(config=None):
    app = Flask(
        __name__,
        static_folder=str(REPO_ROOT / "static"),
        template_folder=str(REPO_ROOT / "templates"),
    )
    app.config.update(construir_config())
    if config:
        app.config.update(config)

    db.init_app(app)
    _ensure_schema(app)
    _register_security(app)
    _register_error_handlers(app)
    _register_pages(app)

    for blueprint in iter_blueprints():
        app.register_blueprint(blueprint)

    return app


def _ensure_schema(app):
    """Aplica as migrations pendentes na subida (idempotente)."""
    conn = db.connect(app.config["DATABASE_PATH"])
    try:
        apply_migrations(conn)
    finally:
        conn.close()


def _register_security(app):
    @app.before_request
    def _bloquear_escrita_em_modo_leitura():
        """Trava de escrita para quando o mapa está publicado sem autenticação."""
        if app.config.get("SOMENTE_LEITURA") and request.method in METODOS_DE_ESCRITA:
            return (
                jsonify({"erro": "O mapa está em modo somente leitura."}),
                403,
            )
        return None

    @app.after_request
    def _cabecalhos_de_seguranca(resposta):
        # A aplicação não carrega nada de terceiros: tudo vem da própria origem.
        # 'unsafe-inline' em style-src cobre os atributos style usados para as
        # cores das facções (que já vêm validadas do backend).
        resposta.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'self'; object-src 'none'; "
            "base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        )
        resposta.headers.setdefault("X-Content-Type-Options", "nosniff")
        resposta.headers.setdefault("X-Frame-Options", "DENY")
        resposta.headers.setdefault("Referrer-Policy", "same-origin")
        resposta.headers.setdefault(
            "Permissions-Policy", "geolocation=(), microphone=(), camera=()"
        )
        if app.config.get("EM_PRODUCAO"):
            resposta.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return resposta


def _register_error_handlers(app):
    @app.errorhandler(ValidationError)
    def _handle_validation_error(error):
        return jsonify({"erro": error.message, "campo": error.field}), 400

    @app.errorhandler(NotFoundError)
    def _handle_not_found(error):
        return jsonify({"erro": error.message}), 404

    @app.errorhandler(404)
    def _handle_http_404(_error):
        return jsonify({"erro": "Endereço não encontrado."}), 404

    @app.errorhandler(405)
    def _handle_http_405(_error):
        return jsonify({"erro": "Método não permitido para este endereço."}), 405

    @app.errorhandler(Exception)
    def _handle_unexpected(error):
        """Falha inesperada: detalhe vai para o log, cliente recebe só o aviso.

        Sem isso, o traceback (caminhos de arquivo, versões, trechos de código)
        chega ao navegador.
        """
        logger.exception("Erro não tratado em %s %s", request.method, request.path)
        if app.config.get("DEBUG"):
            raise error
        return jsonify({"erro": "Erro interno. A equipe foi notificada."}), 500


def _register_pages(app):
    @app.get("/")
    def pagina_mapa():
        return render_template("map.html")

    @app.get("/indice")
    def pagina_indice():
        return render_template("index.html")
