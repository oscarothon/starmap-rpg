"""Validação de payload compartilhada pelos módulos.

As mensagens são exibidas ao usuário, então ficam em português.
"""


class ValidationError(Exception):
    """Erro de validação de entrada — vira HTTP 400 com mensagem em PT-BR."""

    def __init__(self, message, field=None):
        super().__init__(message)
        self.message = message
        self.field = field


class NotFoundError(Exception):
    """Registro inexistente — vira HTTP 404 com mensagem em PT-BR."""

    def __init__(self, message="Registro não encontrado."):
        super().__init__(message)
        self.message = message


_MISSING = object()


def _value(payload, field, default=_MISSING):
    if field in payload:
        return payload[field]
    if default is _MISSING:
        raise ValidationError(f"O campo '{field}' é obrigatório.", field)
    return default


def text(payload, field, default=_MISSING, max_length=None, allow_empty=False):
    """Lê um campo de texto, com trim, tamanho máximo e obrigatoriedade."""
    raw = _value(payload, field, default)
    if raw is None:
        raw = ""
    if not isinstance(raw, str):
        raise ValidationError(f"O campo '{field}' deve ser um texto.", field)
    value = raw.strip()
    if not value and not allow_empty and default is _MISSING:
        raise ValidationError(f"O campo '{field}' não pode ficar vazio.", field)
    if max_length is not None and len(value) > max_length:
        raise ValidationError(
            f"O campo '{field}' deve ter no máximo {max_length} caracteres.", field
        )
    return value


def number(payload, field, default=_MISSING, minimum=None, maximum=None):
    """Lê um campo numérico (float)."""
    raw = _value(payload, field, default)
    if raw is None or raw == "":
        return None
    if isinstance(raw, bool) or not isinstance(raw, (int, float, str)):
        raise ValidationError(f"O campo '{field}' deve ser um número.", field)
    try:
        value = float(raw)
    except (TypeError, ValueError):
        raise ValidationError(f"O campo '{field}' deve ser um número.", field) from None
    _check_range(field, value, minimum, maximum)
    return value


def integer(payload, field, default=_MISSING, minimum=None, maximum=None):
    """Lê um campo inteiro."""
    value = number(payload, field, default, minimum, maximum)
    if value is None:
        return None
    if value != int(value):
        raise ValidationError(f"O campo '{field}' deve ser um número inteiro.", field)
    return int(value)


def boolean(payload, field, default=_MISSING):
    """Lê um campo booleano e devolve 0/1 (formato usado no SQLite)."""
    raw = _value(payload, field, default)
    if isinstance(raw, bool):
        return 1 if raw else 0
    if raw in (0, 1):
        return int(raw)
    if isinstance(raw, str) and raw.strip().lower() in ("true", "false", "0", "1"):
        return 1 if raw.strip().lower() in ("true", "1") else 0
    raise ValidationError(f"O campo '{field}' deve ser verdadeiro ou falso.", field)


def choice(payload, field, options, default=_MISSING):
    """Lê um campo restrito a um conjunto de valores."""
    value = text(payload, field, default, allow_empty=True)
    if value not in options:
        opcoes = ", ".join(sorted(options))
        raise ValidationError(
            f"O campo '{field}' deve ser um destes valores: {opcoes}.", field
        )
    return value


def reference(payload, field, default=_MISSING):
    """Lê uma FK opcional: inteiro positivo ou None."""
    raw = _value(payload, field, default)
    if raw is None or raw == "":
        return None
    value = integer({field: raw}, field, minimum=1)
    return value


def _check_range(field, value, minimum, maximum):
    if minimum is not None and value < minimum:
        raise ValidationError(
            f"O campo '{field}' deve ser maior ou igual a {minimum}.", field
        )
    if maximum is not None and value > maximum:
        raise ValidationError(
            f"O campo '{field}' deve ser menor ou igual a {maximum}.", field
        )


def make_parser(fields):
    """Cria um parser de payload a partir de uma declaração de campos.

    `fields` é uma sequência de (coluna, leitor, opções). Em atualizações
    parciais (PATCH) os campos ausentes no payload são simplesmente ignorados,
    então acrescentar ou remover um campo da entidade é editar uma linha aqui.
    """

    def parse(payload, partial=False):
        values = {}
        for column, reader, options in fields:
            if partial and column not in payload:
                continue
            values[column] = reader(payload, column, **options)
        return values

    return parse


def payload_of(request):
    """Corpo JSON da request como dict, rejeitando formatos inesperados."""
    data = request.get_json(silent=True)
    if data is None:
        raise ValidationError("O corpo da requisição deve ser um JSON válido.")
    if not isinstance(data, dict):
        raise ValidationError("O corpo da requisição deve ser um objeto JSON.")
    return data
