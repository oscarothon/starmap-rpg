"""Acesso genérico a tabelas, reutilizado pelos repositórios dos módulos.

Contrato de segurança desta camada:

- **Valores** sempre entram como parâmetros ligados (`?`), nunca interpolados.
- **Identificadores** (tabela, colunas, ordenação) só podem vir de constantes do
  código. Como o SQLite não parametriza identificadores, eles são validados
  contra um formato estrito e contra a lista de colunas declaradas — assim, se
  alguém um dia ligar um parâmetro de request a `order_by`, o erro estoura aqui
  em vez de virar SQL injection.
"""

import re

from .validation import NotFoundError

IDENTIFICADOR = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
ORDENACAO = re.compile(r"^(?P<coluna>[A-Za-z_][A-Za-z0-9_]*)(?:\s+(?P<sentido>ASC|DESC))?$", re.I)
# Sinais de que um fragmento WHERE foi montado com concatenação de texto.
SUSPEITAS_EM_WHERE = (";", "--", "/*", "'", '"')


def _validar_identificador(valor, contexto):
    if not isinstance(valor, str) or not IDENTIFICADOR.match(valor):
        raise ValueError(f"Identificador SQL inválido em {contexto}: {valor!r}")
    return valor


class Table:
    """Operações básicas sobre uma tabela com chave primária `id`."""

    def __init__(self, name, columns, label="Registro", order_by="id", touch=True):
        self.name = _validar_identificador(name, "nome da tabela")
        self.columns = tuple(
            _validar_identificador(coluna, f"colunas de {name}") for coluna in columns
        )
        self.label = label
        self.touch = touch  # tabela tem updated_at
        self.ordenaveis = set(self.columns) | {"id", "created_at", "updated_at"}
        self.order_by = self._validar_ordenacao(order_by)

    def _validar_ordenacao(self, expressao):
        """Aceita "coluna", "coluna DESC" ou uma lista separada por vírgulas."""
        termos = [termo.strip() for termo in str(expressao).split(",") if termo.strip()]
        if not termos:
            raise ValueError("Ordenação vazia.")

        validados = []
        for termo in termos:
            casamento = ORDENACAO.match(termo)
            if not casamento or casamento.group("coluna") not in self.ordenaveis:
                raise ValueError(
                    f"Ordenação inválida para {self.name}: {termo!r}. "
                    f"Use uma destas colunas: {', '.join(sorted(self.ordenaveis))}."
                )
            sentido = casamento.group("sentido")
            validados.append(
                f"{casamento.group('coluna')} {sentido.upper()}" if sentido else casamento.group("coluna")
            )
        return ", ".join(validados)

    @staticmethod
    def _validar_where(fragmento):
        """Garante que o WHERE é um fragmento constante com placeholders."""
        if any(suspeita in fragmento for suspeita in SUSPEITAS_EM_WHERE):
            raise ValueError(
                "Fragmento WHERE suspeito: use placeholders (?) e passe os valores "
                f"em `params` — recebido: {fragmento!r}"
            )
        return fragmento

    def list_all(self, conn, where="", params=(), order_by=None):
        sql = f"SELECT * FROM {self.name}"
        if where:
            sql += f" WHERE {self._validar_where(where)}"
        sql += f" ORDER BY {self._validar_ordenacao(order_by) if order_by else self.order_by}"
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
            sql += f" WHERE {self._validar_where(where)}"
        return conn.execute(sql, tuple(params)).fetchone()["total"]

    def _writable(self, values):
        return {
            column: value
            for column, value in values.items()
            if column in self.columns and value is not _UNSET
        }


_UNSET = object()
UNSET = _UNSET
