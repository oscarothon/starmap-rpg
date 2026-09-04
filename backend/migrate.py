"""Runner de migrations: aplica os arquivos .sql numerados em ordem.

Cada arquivo em backend/migrations/ é aplicado uma única vez e registrado em
schema_migrations. Módulos novos adicionam arquivos novos (0002_*.sql, ...)
em vez de alterar os existentes.
"""

import sys
from pathlib import Path

from .db import connect

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"

CREATE_MIGRATIONS_TABLE = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"""


def available_migrations(migrations_dir=None):
    """Arquivos .sql disponíveis, ordenados pelo nome (prefixo numérico)."""
    directory = Path(migrations_dir) if migrations_dir else MIGRATIONS_DIR
    return sorted(directory.glob("*.sql"), key=lambda path: path.name)


def applied_versions(conn):
    conn.execute(CREATE_MIGRATIONS_TABLE)
    rows = conn.execute("SELECT version FROM schema_migrations").fetchall()
    return {row["version"] for row in rows}


def apply_migrations(conn, migrations_dir=None):
    """Aplica as migrations pendentes. Devolve a lista de versões aplicadas agora."""
    already_applied = applied_versions(conn)
    newly_applied = []

    for path in available_migrations(migrations_dir):
        version = path.stem
        if version in already_applied:
            continue
        with conn:
            conn.executescript(path.read_text(encoding="utf-8"))
            conn.execute(
                "INSERT INTO schema_migrations (version) VALUES (?)", (version,)
            )
        newly_applied.append(version)

    return newly_applied


def main(argv=None):
    argv = argv if argv is not None else sys.argv[1:]
    target = argv[0] if argv else None
    conn = connect(target)
    try:
        applied = apply_migrations(conn)
    finally:
        conn.close()

    if applied:
        print("Migrations aplicadas: " + ", ".join(applied))
    else:
        print("Banco já está atualizado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
