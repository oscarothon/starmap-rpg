# Planejamento e estado do projeto

Documento canônico de progresso do Mapa Estelar. Atualize a cada sessão de
trabalho: o que ficou pronto, o que ficou pendente e o que espera decisão.

Última atualização: **2026-09-05**

---

## Comece por aqui na próxima sessão

Quatro perguntas em aberto, para responder antes de escrever código novo. As
duas primeiras mudam o modelo de dados; as duas últimas são ajuste de gosto.

**1. Pontos de interesse nos corpos celestes.** A ficha do corpo já está pronta
para recebê-los. Eles são uma lista livre (nome, descrição, tipo) ou algo mais
estruturado — facção dona, nível de acesso, se os jogadores já descobriram?
A versão estruturada depende da decisão de autenticação abaixo: "o que o jogador
já descobriu" só faz sentido se houver jogador identificado.

**2. Geração de corpos em sistemas múltiplos.** Hoje os corpos gerados orbitam o
centro do sistema, mesmo num trinário. O gerador deve distribuir os planetas
entre as estrelas, ou isso é decisão de ambientação que fica melhor à mão?

**3. Cor do sistema no mapa.** Hoje vem da facção soberana. Vale uma camada
alternativa que colore por classe espectral da estrela principal?

**4. Vocabulário da geração aleatória.** As tags e descrições ("Mundo velado",
"Atmosfera corrosiva", os nomes sorteados) foram escritas sem referência do tom
da campanha. Se o clima da sua mesa for outro — mais militar, mais horror, mais
otimista —, o vocabulário fica em `backend/modules/catalog/dados.py` e em
`backend/modules/generator/gerador.py` e pode ser trocado inteiro.

Além disso, seguem em aberto as **duas decisões que bloqueiam publicação**
(autenticação e backup) — detalhadas mais abaixo.

---

## Visão geral

Mapa estelar interativo e **editável pela própria interface**, para uma campanha
de RPG de mesa sci-fi. Referência visual e funcional:
<https://starmap.champlain.group>. Interface inteiramente em português.

Repositório: <https://github.com/oscarothon/starmap-rpg> (privado).

Estado atual: **200 testes verdes** — 107 pytest, 53 vitest, 40 Playwright.

---

## O que já está pronto

### Fase 1 — mapa e índice (2026-09-04)

**Mapa** — pan, zoom com foco no cursor e enquadramento automático (câmera
própria, sem dependências externas); sistemas em SVG com halo da facção
soberana; rotas estilizadas por tipo; rótulos de região hierárquicos com nível
de detalhe por zoom; busca com sugestões e centralização.

**Camadas** — mapa base, rotas, sistemas, nomes de região e influência
geopolítica (mosaico colorido por facção em Canvas 2D, com legenda), com a
preferência salva no navegador.

**Painel do sistema** em três abas — Visão Geral, Sistema e Geopolítica, com
"Acesso restrito" quando o sistema é classificado.

**Modo editor** — criar sistema clicando no mapa, arrastar para reposicionar,
ligar dois sistemas com a ferramenta de rota, editar campos no painel, gerenciar
corpos celestes e influências, excluir com aviso de impacto em cascata.

**Índice de Sistemas** — tabela com todas as métricas, filtro textual, chips de
facção, ordenação por coluna e agrupamento por região; clicar numa linha abre o
sistema no mapa.

**Backend** — Flask 3 + SQLite (SQL puro), migrations numeradas aplicadas na
subida, módulos por domínio registrados em `FEATURE_MODULES`, núcleo reutilizável
(`Table`, `build_crud_blueprint`, validação declarativa).

### Endurecimento de segurança (2026-09-04)

Diretrizes registradas em `CLAUDE.md` e aplicadas ao código: configuração por
ambiente sem segredos no código, `.env` fora do Git, identificadores SQL
validados, busca sem curingas, validadores de cor e URL contra injeção de CSS e
`javascript:`, limites de tamanho em todo texto livre, handler global de erro sem
stack trace, `FLASK_DEBUG` desligado por padrão, cabeçalhos de segurança (CSP,
HSTS, nosniff, X-Frame-Options) e a trava `STARMAP_SOMENTE_LEITURA`.

### Aprimoramento dos componentes (2026-09-05)

**Modelo:** estrelas passaram a ser corpos celestes com classe espectral própria
(migration `0002`, que converteu os dados existentes), o que destravou binários e
trinários e a hierarquia real de órbitas. As colunas `star_count`/`star_type` de
`star_system` viraram legado morto — não são mais lidas nem escritas.

**Catálogo e glossário:** `backend/modules/catalog/dados.py` centraliza classes
de estrela (15, da anã vermelha ao buraco negro), tipos de corpo e de rota,
níveis de região, faixas de população e as seis métricas com o significado de
cada uma das cinco faixas. A página `/glossario` renderiza tudo isso, e os mesmos
dados alimentam os dropdowns e a validação.

**Geração aleatória** (`backend/modules/generator/`): propostas de população e
métricas coerentes entre si (um sistema desabitado não sai com economia de
metrópole), sorteio de nome, e geração de corpos que respeita a zona habitável da
estrela — gigantes gasosos só além da linha de gelo, luas concentradas neles,
cinturão eventual.

**Interface:** administração de regiões e facções em `/administracao`, com aviso
do impacto de cada exclusão; diagrama do sistema reescrito, com múltiplas
estrelas em torno do baricentro, hierarquia de órbitas e nome do corpo no
mouseover; corpos celestes clicáveis na lista e no diagrama, abrindo a ficha —
base para os pontos de interesse; população sem barra, só número e faixa; e a
órbita vazia renomeada para "centro do sistema".

**Proteção de dados:** `backend.seed` passou a recusar apagar bancos que contêm
sistemas criados à mão, exigindo `--forcar`. A trava nasceu de um incidente real:
o seed foi rodado por engano contra o banco de desenvolvimento e apagou um
sistema autoral, recuperado depois das páginas livres do arquivo SQLite.

---

## Decisões pendentes — bloqueiam publicação

### 1. Autenticação de mestre

**Situação:** a aplicação não tem autenticação nenhuma. Quem alcança o servidor
pode criar, editar e excluir qualquer coisa via API. Hoje isso está contido
porque o servidor escuta só em `127.0.0.1`; a trava `STARMAP_SOMENTE_LEITURA=1`
permite publicar o mapa em modo leitura, mas não resolve edição remota.

**Decisão necessária:** qual modelo de acesso a campanha precisa?
- **A.** Mestre único autenticado edita; jogadores leem sem login (mais simples).
- **B.** Mestre edita; jogadores fazem login para ver conteúdo restrito a eles
  (permite segredos por jogador, exige modelo de usuários e permissões).
- **C.** Continuar sem autenticação, editando só localmente e publicando um
  espelho somente leitura.

**Se A ou B:** hash Argon2id com salt por usuário, cookie de sessão
`HttpOnly` + `Secure` + `SameSite=Lax`, token CSRF nas escritas e verificação de
autorização por rota (nunca confiar na interface esconder o botão).

### 2. Backup e persistência do banco

**Situação:** o conteúdo vive num arquivo SQLite sem backup. Em Railway/Render o
disco é efêmero sem volume persistente — **um deploy apagaria a campanha
inteira**. Para material autoral acumulado, o risco de perda é tão sério quanto o
de segurança.

**Decisão necessária:** onde a campanha vai morar?
- **A.** Local apenas, com rotina de backup automático do arquivo (mais simples).
- **B.** Railway/Render com volume persistente + backup periódico para fora.
- **C.** Migrar para Postgres gerenciado (backup do provedor; exige adaptar o
  acesso a dados, que já está isolado nos repositórios por módulo).

---

## Próximas fases (ordem a definir)

Cada módulo entra como pasta em `backend/modules/`, migration nova com tabelas
referenciando as centrais por FK, e — quando aparecer no mapa — uma camada
registrada no `LayerManager`. Nenhum exige refatoração do que já existe.

- **Pontos de interesse** — o próximo passo natural, já que a ficha do corpo
  celeste existe e está vazia. Depende da pergunta 1 lá em cima.
- **Boletins** — feed de notícias/lore por sistema e região, com leitura e
  filtros; marcadores no mapa como camada nova.
- **Procurados** — quadro de recompensas (piratas), com zonas de atividade
  pirata como camada de heatmap.
- **Registro de Corsários** — ranking de caçadores de recompensa.
- **Rastreador de Conflitos** — guerras entre facções, com barra proporcional de
  lados e destaque no mapa.

Melhorias técnicas anotadas, sem urgência: rate limiting nas escritas, auditoria
de dependências (`pip-audit` / `npm audit`), histórico de alterações do mapa
(equivalente ao "Recent Changes" da referência) e limpeza das colunas legadas
`star_count`/`star_type`.
