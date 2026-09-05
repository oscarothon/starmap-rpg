# Mapa Estelar RPG — guia para o Claude Code

> Estado do projeto, decisões pendentes e próximas fases: veja `PLANNING.md`
> (documento canônico de progresso).

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

### Dois pontos de arquitetura que não são óbvios

- **Estrelas são corpos celestes** (`body_type='star'`, com `star_class`), não
  colunas do sistema. É o que permite binários e trinários e a hierarquia do
  diagrama. As colunas `star_system.star_count`/`star_type` são legado morto:
  não leia nem escreva nelas — conte a partir de `celestial_body`.
- **`backend/modules/catalog/dados.py` é a fonte única** de tudo que é
  enumerado: classes de estrela, tipos de corpo e de rota, níveis de região,
  métricas e suas faixas. Alimenta ao mesmo tempo os dropdowns, a validação e a
  página de Glossário. Acrescentar um tipo novo é editar esse arquivo — nunca
  duplicar a lista no frontend.

## Comandos de teste — **rode antes de declarar uma feature pronta**

| Suíte | Comando |
|---|---|
| Backend pytest | `.venv/Scripts/python.exe -m pytest` |
| Frontend vitest | `./node_modules/.bin/vitest run` |
| Playwright E2E | `./node_modules/.bin/playwright test` |

As suítes JS exigem **Node 18+**. Se o Node da máquina for mais antigo, diga
isso em vez de silenciar a suíte.

Servidor de desenvolvimento: `.venv/Scripts/python.exe wsgi.py` (porta 5173).
O reload automático **está desligado** (FLASK_DEBUG=0 por padrão): reinicie o
servidor depois de mexer no backend, ou o navegador vai bater em código velho.

Cenário de exemplo: `.venv/Scripts/python.exe -m backend.seed`. **O seed apaga o
banco** — ele se recusa a rodar se houver sistemas criados à mão e só passa por
cima com `--forcar`. Nunca rode contra `data/starmap.db` sem checar antes o que
existe lá.

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

## Diretrizes de segurança (valem para todo código novo)

Regras definidas pelo dono do projeto. Ao escrever ou revisar código, trate
cada item como requisito, não como sugestão.

**Controle de versão e segredos**
- Nenhum segredo no código: chaves, tokens, senhas e URIs de banco entram por
  variável de ambiente (`backend/config.py`), com `.env` local fora do Git e
  `.env.example` documentando cada variável.
- Em produção (`STARMAP_AMBIENTE=producao`), segredo ausente é erro de
  inicialização — nunca um valor padrão silencioso.
- `.gitignore` bloqueia `.env*`, bancos (`*.db`, `*.sqlite*`, `data/`,
  `backups/`), chaves (`*.pem`, `*.key`) e logs. Ao criar um tipo de arquivo
  sensível novo, adicione a regra antes do primeiro commit.

**Banco de dados**
- Valores sempre como parâmetros ligados (`?`); nunca concatene entrada do
  usuário em SQL.
- Identificadores (tabela, coluna, ordenação) só de constantes do código —
  `Table` (`modules/core/repository.py`) valida formato e lista de colunas, e
  `list_all` recusa fragmentos `WHERE` com sinais de concatenação.
- Busca textual usa `instr(lower(...), lower(?))`, não `LIKE`, para que `%` e
  `_` digitados sejam texto e não curinga.
- O banco nunca pode morar em pasta servida estaticamente (`config.py` recusa).
- Ao migrar para um banco em rede: exigir TLS e usar um usuário sem privilégio
  administrativo (só DML nas tabelas da aplicação).

**Autenticação, autorização e sessões**
- Ainda **não existe autenticação** — ver a seção de pendências abaixo.
- Quando existir: hash de senha com Argon2id (ou bcrypt) e salt por usuário,
  nunca hash simples; cookie de sessão com `HttpOnly`, `Secure` e
  `SameSite=Lax`; token CSRF nas escritas; e verificação de autorização por
  rota (não confie na interface esconder o botão).

**Entradas e exceções**
- Toda entrada passa pelos validadores de `modules/core/validation.py`, com
  tipo, faixa e tamanho máximo declarados — inclusive campos de texto livre.
- Valores que voltam para o HTML como cor ou URL usam `v.color` / `v.safe_url`
  (impedem injeção de CSS e esquemas `javascript:`/`data:`).
- No frontend, texto vai por `textContent`; **nunca** use `innerHTML` com dado
  vindo da API.
- Erro inesperado: log completo no servidor, resposta genérica ao cliente
  (`{"erro": ...}`), sem stack trace nem caminho de arquivo. O handler global
  está em `app.py` — não o contorne com `try/except` que devolve `str(erro)`.
- `FLASK_DEBUG` fica desligado por padrão: o debugger do Werkzeug executa
  código arbitrário pelo navegador.

**Pendências conhecidas (avise antes de publicar)**
- Sem autenticação: qualquer um que alcance o servidor pode criar, editar e
  excluir tudo. Enquanto isso, `STARMAP_SOMENTE_LEITURA=1` trava as escritas.
- Sem limite de requisições (rate limit) e sem backup automático do banco.

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
