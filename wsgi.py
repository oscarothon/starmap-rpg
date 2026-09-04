"""Ponto de entrada para o servidor (dev e gunicorn)."""

import os

from backend.app import create_app
from backend.config import carregar_env, flag

carregar_env()

app = create_app()

if __name__ == "__main__":
    # O debugger do Werkzeug executa código arbitrário a partir do navegador:
    # só liga com FLASK_DEBUG=1 explícito, e apenas em 127.0.0.1.
    app.run(
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", 5173)),
        debug=flag("FLASK_DEBUG"),
    )
