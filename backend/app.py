"""Fábrica da aplicação Flask.

Responsabilidades: configurar o banco, aplicar migrations, registrar os
blueprints dos módulos de feature e servir as páginas.
"""

from pathlib import Path

from flask import Flask, jsonify, render_template

from . import db
from .migrate import apply_migrations
from .modules import iter_blueprints
from .modules.core.validation import NotFoundError, ValidationError

REPO_ROOT = Path(__file__).resolve().parent.parent


def create_app(config=None):
    app = Flask(
        __name__,
        static_folder=str(REPO_ROOT / "static"),
        template_folder=str(REPO_ROOT / "templates"),
    )
    app.config["DATABASE_PATH"] = str(db.database_path())
    if config:
        app.config.update(config)

    db.init_app(app)
    _ensure_schema(app)
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


def _register_pages(app):
    @app.get("/")
    def pagina_mapa():
        return render_template("map.html")

    @app.get("/indice")
    def pagina_indice():
        return render_template("index.html")
