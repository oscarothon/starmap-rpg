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
- **Painel do sistema** em três abas — Visão Geral (aviso, estatísticas, mapa
  orbital), Sistema (corpos celestes com tags, luas aninhadas) e Geopolítica
  (população, equilíbrio de poder, medidores por facção; sistemas classificados
  aparecem como "Acesso restrito").
- **Modo editor**: criar sistema clicando no mapa, arrastar para reposicionar,
  ligar dois sistemas com a ferramenta de rota, editar campos no painel lateral,
  gerenciar corpos celestes e influências, excluir com aviso de impacto em
  cascata.
- **Índice de Sistemas**: tabela com todas as métricas, filtro por texto, chips
  de facção, ordenação por coluna e agrupamento por região.

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

A aplicação sobe em <http://127.0.0.1:5173>. O banco fica em `data/starmap.db`
(configurável com a variável `DATABASE_PATH`) e as migrations são aplicadas
sozinhas na subida.

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
    regions/        regiões hierárquicas
    factions/       facções
    systems/        sistemas, corpos celestes e influências
    lanes/          rotas entre sistemas
    map/            endpoint agregador do mapa
    index/          endpoint do Índice de Sistemas
static/
  css/              tema e telas
  js/
    mapa.js         entrada da tela do mapa
    indice.js       entrada da tela do índice
    modules/
      map/          câmera, camadas, renderizador, busca
      systems/      painel lateral e formulários
      index/        filtro, ordenação e agrupamento da tabela
      shared/       api, dom, diálogos, notificações
templates/          map.html, index.html
tests/              backend (pytest), frontend (vitest), e2e (Playwright)
```

## Acrescentar um módulo novo

O sistema foi montado para que features entrem e saiam sem refatoração:

1. **Backend** — crie `backend/modules/<nome>/` com `repository.py` (a `Table` e
   os campos) e `routes.py` (blueprint, geralmente via `build_crud_blueprint`),
   adicione a migration `000N_<nome>.sql` com tabelas novas referenciando as
   existentes por chave estrangeira, e registre o nome em `FEATURE_MODULES` em
   `backend/modules/__init__.py`.
2. **Frontend** — crie `static/js/modules/<nome>/` e importe a partir da entrada
   da tela onde ele aparece.
3. **Camada nova no mapa** — registre um objeto
   `{ id, rotulo, visivel, desenhar, legenda }` no `LayerManager`
   (`static/js/modules/map/camadas.js`). Nada mais do mapa precisa mudar.
4. **Testes** — `tests/backend/test_<nome>.py` para a API, vitest para lógica
   pura e um spec Playwright se houver fluxo de usuário novo.
