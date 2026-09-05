"""Validação de payload compartilhada pelos módulos.

As mensagens são exibidas ao usuário, então ficam em português e usam o rótulo
da interface — nunca o nome interno da coluna. O nome técnico segue no campo
`campo` da resposta, que é contrato de API (o formulário usa para destacar o
input), não texto de tela.
"""

import re

# Rótulo de interface de cada campo, usado nas mensagens de erro.
ROTULOS = {
    "name": "Nome",
    "parent_id": "Região superior",
    "level": "Nível",
    "description": "Descrição",
    "color_hex": "Cor",
    "sort_order": "Ordem",
    "short_name": "Sigla",
    "flag_icon": "Bandeira",
    "region_id": "Região",
    "x": "Posição X",
    "y": "Posição Y",
    "star_type": "Tipo da estrela",
    "star_count": "Número de estrelas",
    "lore_text": "Descrição",
    "notice_text": "Aviso em destaque",
    "sovereign_faction_id": "Soberania",
    "population": "População",
    "is_classified": "Sistema classificado",
    "economy": "Economia",
    "industry": "Indústria",
    "innovation": "Inovação",
    "information": "Informação",
    "stability": "Estabilidade",
    "quality_of_life": "Qualidade de vida",
    "body_type": "Tipo",
    "parent_body_id": "Órbita",
    "orbital_order": "Ordem orbital",
    "orbital_radius_au": "Raio orbital",
    "is_colonized": "Colonizado",
    "colony_notes": "Notas da colônia",
    "tags": "Tags",
    "system_a_id": "Sistema de origem",
    "system_b_id": "Sistema de destino",
    "lane_type": "Tipo da rota",
    "notes": "Descrição",
    "influences": "Influências",
    "faction_id": "Facção",
    "influence_value": "Influência",
    "trend": "Tendência",
    "qualitative_label": "Rótulo",
    "preset": "Preset da geração",
}


def rotulo(campo):
    """Nome do campo como o usuário o vê no formulário."""
    return ROTULOS.get(campo, campo)


# Limites de tamanho: além de mensagem clara para o usuário, evitam que um
# payload gigante encha o banco.
TEXTO_CURTO = 120
TEXTO_MEDIO = 500
TEXTO_LONGO = 4000
MAXIMO_DE_TAGS = 20

PADRAO_COR = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
ESQUEMAS_PERIGOSOS = ("javascript:", "data:", "vbscript:", "file:")


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
        raise ValidationError(f"O campo {rotulo(field)} é obrigatório.", field)
    return default


def text(payload, field, default=_MISSING, max_length=None, allow_empty=False):
    """Lê um campo de texto, com trim, tamanho máximo e obrigatoriedade."""
    raw = _value(payload, field, default)
    if raw is None:
        raw = ""
    if not isinstance(raw, str):
        raise ValidationError(f"O campo {rotulo(field)} deve ser um texto.", field)
    value = raw.strip()
    if not value and not allow_empty and default is _MISSING:
        raise ValidationError(f"O campo {rotulo(field)} não pode ficar vazio.", field)
    if max_length is not None and len(value) > max_length:
        raise ValidationError(
            f"O campo {rotulo(field)} deve ter no máximo {max_length} caracteres.", field
        )
    return value


def number(payload, field, default=_MISSING, minimum=None, maximum=None):
    """Lê um campo numérico (float)."""
    raw = _value(payload, field, default)
    if raw is None or raw == "":
        return None
    if isinstance(raw, bool) or not isinstance(raw, (int, float, str)):
        raise ValidationError(f"O campo {rotulo(field)} deve ser um número.", field)
    try:
        value = float(raw)
    except (TypeError, ValueError):
        raise ValidationError(f"O campo {rotulo(field)} deve ser um número.", field) from None
    _check_range(field, value, minimum, maximum)
    return value


def integer(payload, field, default=_MISSING, minimum=None, maximum=None):
    """Lê um campo inteiro."""
    value = number(payload, field, default, minimum, maximum)
    if value is None:
        return None
    if value != int(value):
        raise ValidationError(f"O campo {rotulo(field)} deve ser um número inteiro.", field)
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
    raise ValidationError(f"O campo {rotulo(field)} deve ser verdadeiro ou falso.", field)


def choice(payload, field, options, default=_MISSING):
    """Lê um campo restrito a um conjunto de valores."""
    value = text(payload, field, default, allow_empty=True)
    if value not in options:
        opcoes = ", ".join(sorted(options))
        raise ValidationError(
            f"O campo {rotulo(field)} deve ser um destes valores: {opcoes}.", field
        )
    return value


def color(payload, field, default=_MISSING):
    """Cor hexadecimal (#rgb, #rrggbb, #rrggbbaa).

    A cor é injetada em atributos `style` no frontend; sem este formato fechado,
    um valor como `red;background:url(...)` viraria injeção de CSS.
    """
    value = text(payload, field, default, allow_empty=True, max_length=9)
    if not value:
        return ""
    if not PADRAO_COR.match(value):
        raise ValidationError(
            f"O campo {rotulo(field)} deve ser uma cor hexadecimal, como #c9e64b.", field
        )
    return value


def safe_url(payload, field, default=_MISSING, max_length=255):
    """Caminho ou URL sem esquemas executáveis (javascript:, data: etc.)."""
    value = text(payload, field, default, allow_empty=True, max_length=max_length)
    if not value:
        return ""
    achatado = value.strip().lower().replace("\t", "").replace("\n", "")
    if any(achatado.startswith(esquema) for esquema in ESQUEMAS_PERIGOSOS):
        raise ValidationError(
            f"O campo {rotulo(field)} deve ser um caminho ou endereço http(s).", field
        )
    return value


def tag_list(payload, field, default=_MISSING, max_items=MAXIMO_DE_TAGS, max_length=60):
    """Lista de textos curtos, sem repetição e com quantidade limitada."""
    raw = _value(payload, field, default)
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ValidationError(f"O campo {rotulo(field)} deve ser uma lista de textos.", field)
    if len(raw) > max_items:
        raise ValidationError(
            f"O campo {rotulo(field)} aceita no máximo {max_items} itens.", field
        )

    limpas = []
    for item in raw:
        if not isinstance(item, str):
            raise ValidationError(
                f"O campo {rotulo(field)} deve conter apenas textos.", field
            )
        valor = item.strip()
        if not valor:
            continue
        if len(valor) > max_length:
            raise ValidationError(
                f"Cada item de {rotulo(field)} deve ter no máximo {max_length} caracteres.",
                field,
            )
        limpas.append(valor)
    return list(dict.fromkeys(limpas))


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
            f"O campo {rotulo(field)} deve ser maior ou igual a {minimum}.", field
        )
    if maximum is not None and value > maximum:
        raise ValidationError(
            f"O campo {rotulo(field)} deve ser menor ou igual a {maximum}.", field
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
