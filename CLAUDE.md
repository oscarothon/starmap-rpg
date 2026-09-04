# Mapa Estelar RPG — guia para o Claude Code

## Sobre o projeto

- Mapa estelar interativo e **editável** para uma campanha de RPG de mesa sci-fi,
  inspirado em <https://starmap.champlain.group>.
- Backend Flask 3 + SQLite (`sqlite3` puro, `sqlite3.Row`, sem ORM) em `backend/`.
- Frontend sem bundler, com **módulos ES nativos** (`<script type="module">`) e
  **zero dependências externas** — o mapa é SVG (sistemas/rotas) + Canvas 2D
  (mosaico de influência) sincronizados por uma câmera própria em
  `static/js/modules/map/camera.js`.
- Migrations são arquivos SQL numerados em `backend/migrations/`, aplicados na
  subida do app pelo runner `backend/migrate.py`.

## Comandos de teste — **rode antes de declarar uma feature pronta**

| Suíte | Comando |
|---|---|
| Backend pytest | `.venv/Scripts/python.exe -m pytest` |
| Frontend vitest | `./node_modules/.bin/vitest run` |
| Playwright E2E | `./node_modules/.bin/playwright test` |

As suítes JS exigem **Node 18+**. Se o Node da máquina for mais antigo, diga
isso em vez de silenciar a suíte.

Servidor de desenvolvimento: `.venv/Scripts/python.exe wsgi.py` (porta 5173).
Cenário de exemplo: `.venv/Scripts/python.exe -m backend.seed`.

## Idioma — regra que vale para tudo

- **Toda a interface é em português brasileiro**: rótulos, botões, abas,
  mensagens de erro e de validação, textos de confirmação, conteúdo de exemplo.
  Não existe alternância de idioma nem tradução parcial.
- **O código continua em inglês**: nomes de tabelas e colunas, rotas de API
  (`/api/systems`, `/api/lanes`), identificadores internos. Nomes de funções e
  variáveis do frontend seguem o português quando descrevem o domínio
  (`criarCamera`, `desenharRotas`) — mantenha o padrão do arquivo que estiver
  editando.

## Regras para novas features

1. **Rota nova no backend** → testes em `tests/backend/test_<modulo>.py` cobrindo
   caminho feliz + cada validação. Use as fixtures de `tests/conftest.py`
   (`client`, `api`, `conn`).
2. **Lógica pura no frontend** (matemática de câmera, filtro/ordenação da tabela,
   gerenciador de camadas) → teste vitest em `tests/frontend/`.
3. **Fluxo de usuário novo** (criar, arrastar, conectar, excluir, filtrar) →
   spec Playwright em `tests/e2e/`.
4. **Entidade nova** → migration numerada com tabela nova referenciando as
   existentes por FK; **nunca** altere as tabelas centrais das migrations já
   aplicadas.
5. **Camada nova no mapa** → registre `{ id, rotulo, visivel, desenhar, legenda }`
   no `LayerManager` (`static/js/modules/map/camadas.js`) em vez de mexer no
   renderizador.
6. **Módulo de backend novo** → pasta em `backend/modules/`, blueprint em
   `routes.py`, e o nome em `FEATURE_MODULES` (`backend/modules/__init__.py`).

## Restrições importantes

- **Não versione bancos**: `data/starmap.db` e `.tmp-e2e.db` estão no
  `.gitignore` — os testes usam SQLite isolado via `DATABASE_PATH`.
- **Não use `git add -A` / `git add .`** — sempre stage arquivos específicos.
- **Co-author obrigatório** em todo commit e corpo de PR criado pelo Claude.
- Não adicione dependências de frontend sem necessidade real: a ausência de
  bundler e de bibliotecas é uma escolha do projeto, não um acidente.

## Padrões do código

- Backend: `from .db import ...`, `from ..core import validation as v`;
  validação declarativa com `v.make_parser(FIELDS)`; erros de usuário via
  `ValidationError`/`NotFoundError` (viram 400/404 com `{"erro": ...}`).
- CRUD repetitivo usa `build_crud_blueprint` (`backend/modules/core/crud.py`) e
  `Table` (`backend/modules/core/repository.py`); só escreva rotas à mão quando
  o módulo tiver regra própria (como `systems` e `lanes`).
- Frontend: um módulo por responsabilidade, `import`/`export` explícitos, DOM
  criado com os helpers de `shared/dom.js` (`el`, `svg`, `limpar`).
- Fase 1 entregue: mapa + índice + CRUD completo. Fases seguintes previstas:
  Boletins, Procurados, Registro de Corsários, Rastreador de Conflitos.
