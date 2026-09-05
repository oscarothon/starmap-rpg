# Mapa Estelar — RPG sci-fi

Mapa estelar interativo e editável para campanhas de RPG de mesa de ficção
científica. Inspirado no [Starmap of the Orion Arm](https://starmap.champlain.group),
mas com uma diferença central: aqui o conteúdo é **criado e editado pela própria
interface**, sem mexer em arquivos de dados na mão.

Toda a interface é em português brasileiro.

## O que já existe (Fase 1)

- **Mapa interativo**: pan, zoom com foco no cursor, enquadramento automático,
  rotas entre sistemas, rótulos de região que aparecem conforme o zoom.
- **Camadas ligáveis**: mapa base, rotas, sistemas, nomes de região e influência
  geopolítica (mosaico colorido por facção, com legenda). A escolha fica salva
  no navegador.
- **Busca de sistemas** com sugestões e centralização no mapa.
- **Painel do sistema** em três abas — Visão Geral (aviso, estatísticas, mapa do
  sistema), Sistema (corpos celestes com tags, luas aninhadas) e Geopolítica
  (população, equilíbrio de poder, medidores por facção; sistemas classificados
  aparecem como "Acesso restrito").
- **Mapa do sistema** com a hierarquia real: múltiplas estrelas em torno do
  baricentro, planetas na órbita de cada uma, luas aninhadas. O nome do corpo
  aparece ao passar o mouse, e clicar abre a ficha dele.
- **Modo editor**: criar sistema clicando no mapa, arrastar para reposicionar,
  ligar dois sistemas com a ferramenta de rota, editar campos no painel lateral,
  gerenciar corpos celestes e influências, excluir com aviso de impacto em
  cascata.
- **Geração aleatória**: sorteio de nome, de população e métricas coerentes
  entre si, e geração de um sistema inteiro de corpos que respeita a zona
  habitável da estrela.
- **Índice de Sistemas**: tabela com todas as métricas, filtro por texto, chips
  de facção, ordenação por coluna e agrupamento por região.
- **Glossário** (`/glossario`): classes de estrela, tipos de corpo e de rota,
  níveis de região e o significado de cada faixa das seis métricas.
- **Regiões e facções** (`/administracao`): criar, editar e excluir, com aviso do
  que a exclusão afeta.

Boletins, Procurados, Registro de Corsários e Rastreador de Conflitos ficaram
para fases seguintes — a arquitetura já reserva o encaixe deles.

## Stack

- **Backend**: Flask 3 + SQLite com `sqlite3` puro (sem ORM), migrations em SQL
  numerado.
- **Frontend**: JavaScript com módulos ES nativos, sem bundler e sem
  dependências externas. Mapa em SVG (sistemas e rotas, interativos) + Canvas 2D
  (mosaico de influência), com uma câmera única sincronizando as duas camadas.

## Como rodar

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements-dev.txt   # Linux/macOS: .venv/bin/python
.venv/Scripts/python.exe -m backend.seed                          # cenário de exemplo (opcional)
.venv/Scripts/python.exe wsgi.py
```

A aplicação sobe em <http://127.0.0.1:5173>, com quatro telas: o mapa (`/`), o
Índice de Sistemas (`/indice`), o Glossário (`/glossario`) e a administração de
regiões e facções (`/administracao`).

O banco fica em `data/starmap.db` (configurável com `DATABASE_PATH`) e as
migrations são aplicadas sozinhas na subida.

> **`backend.seed` apaga o banco antes de recriar o cenário.** Ele se recusa a
> rodar quando encontra sistemas criados à mão e só passa por cima com
> `--forcar` — mas vale conferir o que existe antes de rodar.

## Configuração e segurança

Copie `.env.example` para `.env` e ajuste — o arquivo fica fora do Git. Nenhum
segredo mora no código; em produção (`STARMAP_AMBIENTE=producao`) a ausência de
`SECRET_KEY` impede a subida da aplicação, em vez de usar um valor padrão.

Variáveis principais:

| Variável | Para quê |
|---|---|
| `SECRET_KEY` | Assinatura de sessão. Obrigatória em produção. |
| `DATABASE_PATH` | Caminho do SQLite (recusado se apontar para `static/`). |
| `STARMAP_AMBIENTE` | `desenvolvimento` ou `producao`. |
| `FLASK_DEBUG` | Debugger do Werkzeug. Mantenha `0` em qualquer servidor exposto. |
| `STARMAP_SOMENTE_LEITURA` | `1` bloqueia toda escrita na API. |

> **Antes de publicar:** a aplicação ainda **não tem autenticação** — quem
> alcança o servidor pode editar e excluir tudo. Para deixar o mapa disponível
> aos jogadores com segurança hoje, suba com `STARMAP_SOMENTE_LEITURA=1` e edite
> localmente.

## Testes

| Suíte | Comando |
|---|---|
| Backend (pytest) | `.venv/Scripts/python.exe -m pytest` |
| Frontend (vitest) | `./node_modules/.bin/vitest run` |
| E2E (Playwright) | `./node_modules/.bin/playwright test` |

As suítes JavaScript exigem **Node 18+** (`npm install` e
`./node_modules/.bin/playwright install chromium` antes da primeira execução).

## Estrutura

```
backend/
  app.py            fábrica do Flask, registro dos blueprints
  db.py             conexão SQLite (sqlite3.Row, chaves estrangeiras ligadas)
  migrate.py        runner das migrations
  seed.py           cenário de exemplo
  migrations/       SQL numerado (0001_init.sql, ...)
  modules/
    core/           validação, CRUD genérico e acesso a tabelas
    catalog/        fonte única do conteúdo enumerado (dropdowns + glossário)
    regions/        regiões hierárquicas
    factions/       facções
    systems/        sistemas, corpos celestes e influências
    lanes/          rotas entre sistemas
    map/            endpoint agregador do mapa
    index/          endpoint do Índice de Sistemas
    generator/      geração aleatória de sistemas e corpos
static/
  css/              tema e telas
  js/
    mapa.js         entrada da tela do mapa
    indice.js       entrada da tela do índice
    glossario.js    entrada do glossário
    administracao.js entrada de regiões e facções
    modules/
      map/          câmera, camadas, renderizador, busca
      systems/      painel lateral, diagrama do sistema e formulários
      index/        filtro, ordenação e agrupamento da tabela
      shared/       api, dom, diálogos, notificações
templates/          map.html, index.html, glossario.html, administracao.html
tests/              backend (pytest), frontend (vitest), e2e (Playwright)
```

### Duas decisões de modelo que valem saber

- **Estrelas são corpos celestes** (`body_type='star'`, com `star_class`), não
  colunas do sistema. É o que permite binários e trinários e a hierarquia do
  diagrama: um corpo sem `parent_body_id` orbita o centro do sistema, com
  `parent_body_id` orbita aquele corpo.
- **`backend/modules/catalog/dados.py` é a fonte única** do conteúdo enumerado —
  classes de estrela, tipos de corpo e de rota, níveis de região, métricas e
  faixas. Alimenta ao mesmo tempo os dropdowns, a validação do backend e o
  Glossário. Acrescentar um tipo novo é editar esse arquivo, e só ele.

## Acrescentar um módulo novo

O sistema foi montado para que features entrem e saiam sem refatoração:

1. **Backend** — crie `backend/modules/<nome>/` com `repository.py` (a `Table` e
   os campos) e `routes.py` (blueprint, geralmente via `build_crud_blueprint`),
   adicione a migration `000N_<nome>.sql` com tabelas novas referenciando as
   existentes por chave estrangeira, e registre o nome em `FEATURE_MODULES` em
   `backend/modules/__init__.py`.
2. **Frontend** — crie `static/js/modules/<nome>/` e importe a partir da entrada
   da tela onde ele aparece.
3. **Conteúdo enumerado novo** (um tipo, uma categoria, uma escala) — acrescente
   ao catálogo em vez de espalhar listas pelo código; ele já aparece nos
   dropdowns e no Glossário.
4. **Camada nova no mapa** — registre um objeto
   `{ id, rotulo, visivel, desenhar, legenda }` no `LayerManager`
   (`static/js/modules/map/camadas.js`). Nada mais do mapa precisa mudar.
5. **Testes** — `tests/backend/test_<nome>.py` para a API, vitest para lógica
   pura e um spec Playwright se houver fluxo de usuário novo.

## Estado e próximos passos

`PLANNING.md` é o documento canônico de progresso: o que está pronto, as
perguntas em aberto e as duas decisões que ainda bloqueiam publicação
(autenticação e backup).
