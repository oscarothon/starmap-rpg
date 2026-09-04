"""Acesso genérico a tabelas, reutilizado pelos repositórios dos módulos.

Nomes de tabela e coluna vêm sempre de constantes do código (nunca de entrada
do usuário); os valores são passados como parâmetros ligados.
"""

from .validation import NotFoundError


class Table:
    """Operações básicas sobre uma tabela com chave primária `id`."""

    def __init__(self, name, columns, label="Registro", order_by="id", touch=True):
        self.name = name
        self.columns = tuple(columns)
        self.label = label
        self.order_by = order_by
        self.touch = touch  # tabela tem updated_at

    def list_all(self, conn, where="", params=(), order_by=None):
        sql = f"SELECT * FROM {self.name}"
        if where:
            sql += f" WHERE {where}"
        sql += f" ORDER BY {order_by or self.order_by}"
        return conn.execute(sql, tuple(params)).fetchall()

    def find(self, conn, row_id):
        return conn.execute(
            f"SELECT * FROM {self.name} WHERE id = ?", (row_id,)
        ).fetchone()

    def get(self, conn, row_id):
        row = self.find(conn, row_id)
        if row is None:
            raise NotFoundError(f"{self.label} não encontrado(a).")
        return row

    def exists(self, conn, row_id):
        return self.find(conn, row_id) is not None

    def insert(self, conn, values):
        data = self._writable(values)
        if not data:
            raise ValueError("Nenhuma coluna gravável foi informada.")
        columns = ", ".join(data)
        placeholders = ", ".join("?" for _ in data)
        cursor = conn.execute(
            f"INSERT INTO {self.name} ({columns}) VALUES ({placeholders})",
            tuple(data.values()),
        )
        return cursor.lastrowid

    def update(self, conn, row_id, values):
        data = self._writable(values)
        if not data:
            return
        assignments = ", ".join(f"{column} = ?" for column in data)
        if self.touch:
            assignments += ", updated_at = datetime('now')"
        conn.execute(
            f"UPDATE {self.name} SET {assignments} WHERE id = ?",
            (*data.values(), row_id),
        )

    def delete(self, conn, row_id):
        conn.execute(f"DELETE FROM {self.name} WHERE id = ?", (row_id,))

    def count(self, conn, where="", params=()):
        sql = f"SELECT COUNT(*) AS total FROM {self.name}"
        if where:
            sql += f" WHERE {where}"
        return conn.execute(sql, tuple(params)).fetchone()["total"]

    def _writable(self, values):
        return {
            column: value
            for column, value in values.items()
            if column in self.columns and value is not _UNSET
        }


_UNSET = object()
UNSET = _UNSET
