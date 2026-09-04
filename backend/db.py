"""Acesso ao SQLite: conexão, integração com o ciclo de request do Flask."""

import os
import sqlite3
from pathlib import Path

from flask import current_app, g

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATABASE_PATH = REPO_ROOT / "data" / "starmap.db"


def database_path():
    """Caminho do banco: DATABASE_PATH no ambiente ou o padrão do repositório."""
    return Path(os.environ.get("DATABASE_PATH") or DEFAULT_DATABASE_PATH)


def connect(path=None):
    """Abre uma conexão configurada (Row factory + chaves estrangeiras ligadas)."""
    path = Path(path) if path else database_path()
    if str(path) != ":memory:":
        path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_db():
    """Conexão da request atual, criada sob demanda e fechada no teardown."""
    if "db" not in g:
        g.db = connect(current_app.config.get("DATABASE_PATH"))
    return g.db


def close_db(_exception=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_app(app):
    app.teardown_appcontext(close_db)


def rows_to_dicts(rows):
    """sqlite3.Row -> dict, para serializar em JSON."""
    return [dict(row) for row in rows]


def row_to_dict(row):
    return dict(row) if row is not None else None
