"""Configuração vinda do ambiente.

Nenhum segredo mora no código: tudo entra por variável de ambiente, com um
`.env` local opcional para desenvolvimento (que está no .gitignore). Em
produção, a falta de um segredo é erro de inicialização — nunca um valor
padrão silencioso.
"""

import logging
import os
import secrets
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ARQUIVO_ENV = REPO_ROOT / ".env"

logger = logging.getLogger(__name__)

VERDADEIROS = {"1", "true", "sim", "on", "yes"}


def carregar_env(caminho=ARQUIVO_ENV):
    """Lê um .env simples (CHAVE=valor) sem sobrescrever o ambiente real."""
    caminho = Path(caminho)
    if not caminho.exists():
        return

    for linha in caminho.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, _, valor = linha.partition("=")
        # O ambiente real tem prioridade sobre o arquivo.
        os.environ.setdefault(chave.strip(), valor.strip().strip("\"'"))


def flag(nome, padrao=False):
    valor = os.environ.get(nome)
    if valor is None:
        return padrao
    return valor.strip().lower() in VERDADEIROS


def em_producao():
    return os.environ.get("STARMAP_AMBIENTE", "desenvolvimento").lower() in (
        "producao",
        "production",
        "prod",
    )


def chave_secreta():
    """SECRET_KEY do Flask: obrigatória em produção, efêmera em desenvolvimento."""
    chave = os.environ.get("SECRET_KEY")
    if chave:
        return chave
    if em_producao():
        raise RuntimeError(
            "SECRET_KEY não definida. Configure a variável de ambiente antes de "
            "subir a aplicação em produção."
        )
    logger.warning(
        "SECRET_KEY ausente: usando chave efêmera de desenvolvimento. "
        "As sessões caem a cada reinício."
    )
    return secrets.token_urlsafe(32)


def caminho_do_banco():
    """Caminho do banco, recusando locais servidos publicamente."""
    caminho = os.environ.get("DATABASE_PATH") or str(REPO_ROOT / "data" / "starmap.db")

    resolvido = Path(caminho).expanduser().resolve()
    for publica in (REPO_ROOT / "static", REPO_ROOT / "templates"):
        if resolvido.is_relative_to(publica.resolve()):
            raise RuntimeError(
                f"DATABASE_PATH aponta para dentro de {publica.name}/, que é servido "
                "publicamente — o banco ficaria disponível para download."
            )
    return caminho


def construir_config():
    """Dicionário de configuração aplicado ao app Flask."""
    carregar_env()
    return {
        "SECRET_KEY": chave_secreta(),
        "DATABASE_PATH": caminho_do_banco(),
        "DEBUG": flag("FLASK_DEBUG"),
        # Trava de escrita: com ela ligada a API só responde leitura. Serve para
        # publicar o mapa para os jogadores enquanto não existe autenticação.
        "SOMENTE_LEITURA": flag("STARMAP_SOMENTE_LEITURA"),
        "EM_PRODUCAO": em_producao(),
    }
